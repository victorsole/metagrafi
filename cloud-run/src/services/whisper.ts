import FormData from 'form-data';
import { Readable } from 'stream';

const WHISPER_API_URL = 'https://api.openai.com/v1/audio/transcriptions';
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB - Whisper API limit

export interface WhisperResponse {
  text: string;
  duration?: number;
}

export async function transcribeWithWhisper(
  audioBuffer: Buffer,
  filename: string
): Promise<WhisperResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  if (audioBuffer.length > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is 25MB, got ${(audioBuffer.length / 1024 / 1024).toFixed(1)}MB`);
  }

  const formData = new FormData();
  formData.append('file', Readable.from(audioBuffer), {
    filename,
    contentType: getContentType(filename),
    knownLength: audioBuffer.length,
  });
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');

  // Use node-fetch compatible approach with form-data
  const response = await new Promise<Response>((resolve, reject) => {
    const https = require('https');
    const url = new URL(WHISPER_API_URL);

    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        ...formData.getHeaders(),
      },
    }, (res: import('http').IncomingMessage) => {
      let data = '';
      res.on('data', (chunk: Buffer) => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode! >= 200 && res.statusCode! < 300,
          status: res.statusCode!,
          statusText: res.statusMessage || '',
          text: async () => data,
          json: async () => JSON.parse(data),
        } as unknown as Response);
      });
    });

    req.on('error', reject);
    formData.pipe(req);
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Whisper API error:', errorText);
    throw new Error(`Whisper API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json() as { text: string; duration?: number };

  return {
    text: result.text,
    duration: result.duration,
  };
}

function getContentType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  const contentTypes: Record<string, string> = {
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    wav: 'audio/wav',
    webm: 'audio/webm',
    m4a: 'audio/m4a',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
  };
  return contentTypes[ext || ''] || 'application/octet-stream';
}
