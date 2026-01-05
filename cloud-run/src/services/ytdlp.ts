import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, unlink, readdir } from 'fs/promises';
import path from 'path';
import type { SourceType } from './firestore.js';

const execAsync = promisify(exec);
const TEMP_DIR = '/tmp';
const DOWNLOAD_TIMEOUT = 120000; // 2 minutes

export interface DownloadResult {
  buffer: Buffer;
  filename: string;
}

export function detectSourceType(url: string): SourceType {
  const urlLower = url.toLowerCase();

  // YouTube is blocked by Google's anti-bot detection on datacenter IPs
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
    return 'youtube';
  }
  if (urlLower.includes('instagram.com')) {
    return 'instagram';
  }
  if (urlLower.includes('tiktok.com')) {
    return 'tiktok';
  }
  if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) {
    return 'other'; // Twitter/X - supported by yt-dlp
  }
  if (urlLower.includes('facebook.com') || urlLower.includes('fb.watch')) {
    return 'other'; // Facebook - supported by yt-dlp
  }
  if (urlLower.includes('vimeo.com')) {
    return 'other'; // Vimeo - supported by yt-dlp
  }
  if (urlLower.includes('soundcloud.com')) {
    return 'other'; // SoundCloud - supported by yt-dlp
  }

  return 'other';
}

export function isBlockedPlatform(url: string): boolean {
  const urlLower = url.toLowerCase();
  // YouTube actively blocks datacenter IPs
  return urlLower.includes('youtube.com') || urlLower.includes('youtu.be');
}

export async function downloadAudio(url: string): Promise<DownloadResult> {
  // Generate unique filename prefix
  const prefix = `audio_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const outputTemplate = path.join(TEMP_DIR, `${prefix}.%(ext)s`);

  // yt-dlp command to extract audio as mp3
  // Added anti-bot workarounds for YouTube
  const cmd = [
    'yt-dlp',
    '--extract-audio',
    '--audio-format', 'mp3',
    '--audio-quality', '128K',
    '--max-filesize', '25M',
    '--no-playlist',
    '--no-warnings',
    '--quiet',
    // Anti-bot workarounds
    '--user-agent', '"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"',
    '--extractor-args', '"youtube:player_client=web"',
    '--geo-bypass',
    '--output', `"${outputTemplate}"`,
    `"${url}"`
  ].join(' ');

  console.log(`Downloading audio from: ${url}`);

  try {
    await execAsync(cmd, {
      timeout: DOWNLOAD_TIMEOUT,
      maxBuffer: 10 * 1024 * 1024 // 10MB stdout buffer
    });
  } catch (error) {
    const err = error as Error & { stderr?: string };
    console.error('yt-dlp error:', err.stderr || err.message);
    throw new Error(`Failed to download audio: ${err.message}`);
  }

  // Find the downloaded file
  const files = await readdir(TEMP_DIR);
  const audioFile = files.find(f => f.startsWith(prefix) && f.endsWith('.mp3'));

  if (!audioFile) {
    throw new Error('Failed to extract audio: no output file found');
  }

  const filePath = path.join(TEMP_DIR, audioFile);
  const buffer = await readFile(filePath);

  // Clean up the file
  try {
    await unlink(filePath);
  } catch {
    // Ignore cleanup errors
  }

  console.log(`Downloaded ${audioFile}: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);

  return {
    buffer,
    filename: audioFile,
  };
}

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}
