import { Router } from 'express';
import { createTranscription, markCompleted, markFailed } from '../services/firestore.js';
import { transcribeWithWhisper } from '../services/whisper.js';
import { downloadAudio, detectSourceType, isValidUrl, isBlockedPlatform } from '../services/ytdlp.js';

export const transcribeUrlRouter = Router();

transcribeUrlRouter.post('/', async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  if (!isValidUrl(url)) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  // Check for blocked platforms (YouTube)
  if (isBlockedPlatform(url)) {
    return res.status(400).json({
      error: 'YouTube is currently blocked by anti-bot detection. Please download the video and upload the file directly.',
    });
  }

  const sourceType = detectSourceType(url);
  console.log(`Processing URL: ${url} (source: ${sourceType})`);

  // Create initial record
  let docId: string;
  try {
    docId = await createTranscription({
      sourceUrl: url,
      sourceType,
    });
  } catch (error) {
    console.error('Failed to create transcription record:', error);
    return res.status(500).json({ error: 'Failed to initialize transcription' });
  }

  try {
    // Download audio using yt-dlp
    console.log(`Downloading audio for ${docId}...`);
    const { buffer, filename } = await downloadAudio(url);

    // Transcribe with Whisper
    console.log(`Transcribing ${docId}...`);
    const result = await transcribeWithWhisper(buffer, filename);

    // Mark as completed
    await markCompleted(docId, result.text, result.duration ? Math.round(result.duration) : undefined);

    console.log(`Transcription completed: ${docId}`);

    return res.json({
      id: docId,
      transcription: result.text,
      status: 'completed',
    });
  } catch (error) {
    const err = error as Error;
    console.error(`Transcription failed for ${docId}:`, err.message);

    await markFailed(docId, err.message);

    return res.status(500).json({
      id: docId,
      error: err.message,
      status: 'failed',
    });
  }
});
