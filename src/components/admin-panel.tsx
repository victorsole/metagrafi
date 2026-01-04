import { useState, useEffect } from 'react'
import Icon from '@mdi/react'
import { mdiYoutube, mdiInstagram, mdiMusicNote, mdiFileUpload, mdiLink } from '@mdi/js'
import { getAdminStats, AdminStats, TranscriptionRecord } from '../lib/supabase'
import { LoadingSpinner } from './loading-spinner'

interface AdminPanelProps {
  secret: string
}

const sourceIcons: Record<string, string> = {
  youtube: mdiYoutube,
  instagram: mdiInstagram,
  tiktok: mdiMusicNote,
  upload: mdiFileUpload,
  other: mdiLink
}

export function AdminPanel({ secret }: AdminPanelProps) {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true)
        const data = await getAdminStats(secret)
        setStats(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stats')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [secret])

  if (loading && !stats) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner message="Loading admin data..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    )
  }

  if (!stats) return null

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-green-100 text-green-800',
      processing: 'bg-yellow-100 text-yellow-800',
      pending: 'bg-gray-100 text-gray-800',
      failed: 'bg-red-100 text-red-800'
    }
    return colors[status] || colors.pending
  }

  const getSourceIcon = (source: string) => {
    return sourceIcons[source] || sourceIcons.other
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-3xl font-bold text-beresol-green">{stats.total}</div>
          <div className="text-gray-500 text-sm">Total Transcriptions</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-3xl font-bold text-beresol-green">{stats.today}</div>
          <div className="text-gray-500 text-sm">Today</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-gray-500 text-sm">Completed</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-3xl font-bold text-red-600">{stats.failed}</div>
          <div className="text-gray-500 text-sm">Failed</div>
        </div>
      </div>

      {/* Source Breakdown */}
      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="font-semibold text-lg mb-3">By Source</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(stats.bySource).map(([source, count]) => (
            <div key={source} className="flex items-center gap-2 bg-beresol-cream/50 px-3 py-2 rounded-lg">
              <Icon path={getSourceIcon(source)} size={0.8} className="text-beresol-green" />
              <span className="font-medium capitalize">{source}</span>
              <span className="text-gray-500">({count})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Transcriptions Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h3 className="font-semibold text-lg">Recent Transcriptions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">URL/File</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stats.transcriptions.map((t: TranscriptionRecord) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Icon path={getSourceIcon(t.source_type)} size={0.9} className="text-beresol-green" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-xs truncate text-sm">
                      {t.source_url || t.original_filename || '-'}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(t.status)}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(t.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-xs truncate text-sm text-gray-600">
                      {t.transcription_text?.slice(0, 50) || t.error_message || '-'}
                      {t.transcription_text && t.transcription_text.length > 50 && '...'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
