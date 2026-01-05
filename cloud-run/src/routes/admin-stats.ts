import { Router } from 'express';
import { getAdminStats } from '../services/firestore.js';

export const adminStatsRouter = Router();

adminStatsRouter.get('/', async (req, res) => {
  const secret = req.query.secret as string;

  if (!secret) {
    return res.status(401).json({ error: 'Secret is required' });
  }

  try {
    const stats = await getAdminStats(secret);

    // Transform Firestore Timestamps to ISO strings for JSON response
    const transcriptions = stats.transcriptions.map(t => ({
      ...t,
      createdAt: t.createdAt?.toDate?.()?.toISOString() ?? t.createdAt,
      completedAt: t.completedAt?.toDate?.()?.toISOString() ?? t.completedAt,
    }));

    return res.json({
      ...stats,
      transcriptions,
    });
  } catch (error) {
    const err = error as Error;

    if (err.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Invalid secret' });
    }

    console.error('Failed to fetch admin stats:', err.message);
    return res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});
