import { Router } from 'express';
import multer from 'multer';
import { createTranscription, markCompleted, markFailed } from '../services/firestore.js';
import { transcribeWithWhisper } from '../services/whisper.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/webm',
      'audio/m4a',
      'audio/x-m4a',
      'audio/mp4',
      'video/mp4',
      'video/webm',
      'audio/ogg',
      'audio/flac',
    ];

    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(mp3|mp4|wav|webm|m4a|ogg|flac)$/i)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`));
    }
  },
});

export const transcribeUploadRouter = Router();

transcribeUploadRouter.post('/', upload.single('file'), async (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  console.log(`Received file: ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

  // Create initial record
  let docId: string;
  try {
    docId = await createTranscription({
      sourceType: 'upload',
      originalFilename: file.originalname,
    });
  } catch (error) {
    console.error('Failed to create transcription record:', error);
    return res.status(500).json({ error: 'Failed to initialize transcription' });
  }

  try {
    // Transcribe with Whisper
    const result = await transcribeWithWhisper(file.buffer, file.originalname);

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
