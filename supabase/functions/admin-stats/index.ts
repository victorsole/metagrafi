import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check admin secret
    const url = new URL(req.url)
    const secret = url.searchParams.get('secret')
    const adminSecret = Deno.env.get('ADMIN_SECRET')

    if (secret !== adminSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get stats
    const { count: totalCount } = await supabase
      .from('transcriptions')
      .select('*', { count: 'exact', head: true })

    const today = new Date().toISOString().split('T')[0]
    const { count: todayCount } = await supabase
      .from('transcriptions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today)

    // Get counts by status
    const { count: completedCount } = await supabase
      .from('transcriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')

    const { count: failedCount } = await supabase
      .from('transcriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed')

    // Get counts by source type
    const { data: sourceTypeCounts } = await supabase
      .from('transcriptions')
      .select('source_type')

    const sourceBreakdown = (sourceTypeCounts || []).reduce((acc: Record<string, number>, item) => {
      const type = item.source_type || 'unknown'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {})

    // Get recent transcriptions
    const { data: recent } = await supabase
      .from('transcriptions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    return new Response(
      JSON.stringify({
        total: totalCount,
        today: todayCount,
        completed: completedCount,
        failed: failedCount,
        bySource: sourceBreakdown,
        transcriptions: recent
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
