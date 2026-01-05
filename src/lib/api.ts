const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  console.warn('API URL not configured. Please set VITE_API_URL in .env.local');
}

export interface TranscriptionResult {
  id: string;
  transcription: string;
  status: 'completed' | 'failed' | 'processing';
  error?: string;
}

export interface TranscriptionRecord {
  id: string;
  source_url: string | null;
  source_type: 'youtube' | 'instagram' | 'tiktok' | 'upload' | 'other';
  original_filename: string | null;
  transcription_text: string | null;
  duration_seconds: number | null;
  language: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface AdminStats {
  total: number;
  today: number;
  completed: number;
  failed: number;
  bySource: Record<string, number>;
  transcriptions: TranscriptionRecord[];
}

export async function transcribeUrl(url: string): Promise<TranscriptionResult> {
  const response = await fetch(`${API_URL}/api/transcribe-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to transcribe URL');
  }

  return data;
}

export async function transcribeFile(file: File): Promise<TranscriptionResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/api/transcribe-upload`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to transcribe file');
  }

  return data;
}

export async function getAdminStats(secret: string): Promise<AdminStats> {
  const response = await fetch(
    `${API_URL}/api/admin-stats?secret=${encodeURIComponent(secret)}`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch admin stats');
  }

  // Transform camelCase from backend to snake_case for frontend compatibility
  const transcriptions = data.transcriptions.map((t: Record<string, unknown>) => ({
    id: t.id,
    source_url: t.sourceUrl,
    source_type: t.sourceType,
    original_filename: t.originalFilename,
    transcription_text: t.transcriptionText,
    duration_seconds: t.durationSeconds,
    language: t.language,
    status: t.status,
    error_message: t.errorMessage,
    created_at: t.createdAt,
    completed_at: t.completedAt,
  }));

  return {
    ...data,
    transcriptions,
  };
}
