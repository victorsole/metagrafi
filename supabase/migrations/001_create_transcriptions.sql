-- Transcriptions table
CREATE TABLE transcriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_url TEXT,
    source_type TEXT CHECK (source_type IN ('youtube', 'instagram', 'tiktok', 'upload', 'other')),
    original_filename TEXT,
    transcription_text TEXT,
    duration_seconds INTEGER,
    language TEXT DEFAULT 'en',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_transcriptions_created_at ON transcriptions(created_at DESC);
CREATE INDEX idx_transcriptions_status ON transcriptions(status);

-- Enable RLS
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (public service)
CREATE POLICY "Public insert" ON transcriptions
    FOR INSERT TO anon WITH CHECK (true);

-- Allow anyone to read (to check their transcription status)
CREATE POLICY "Public read" ON transcriptions
    FOR SELECT TO anon USING (true);

-- Create storage bucket for audio uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-uploads', 'audio-uploads', false);

-- Allow anyone to upload to audio-uploads bucket
CREATE POLICY "Public upload" ON storage.objects
    FOR INSERT TO anon
    WITH CHECK (bucket_id = 'audio-uploads');

-- Allow reading uploaded files
CREATE POLICY "Public read uploads" ON storage.objects
    FOR SELECT TO anon
    USING (bucket_id = 'audio-uploads');
