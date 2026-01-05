import express from 'express';
import cors from 'cors';
import { transcribeUploadRouter } from './routes/transcribe-upload.js';
import { transcribeUrlRouter } from './routes/transcribe-url.js';
import { adminStatsRouter } from './routes/admin-stats.js';

const app = express();

// CORS configuration
app.use(cors({
  origin: [
    'https://metagrafi.beresol.eu',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/transcribe-upload', transcribeUploadRouter);
app.use('/api/transcribe-url', transcribeUrlRouter);
app.use('/api/admin-stats', adminStatsRouter);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Metagrafi API running on port ${PORT}`);
});
