import { Firestore, Timestamp } from '@google-cloud/firestore';

const db = new Firestore();
const COLLECTION = 'transcriptions';

export type SourceType = 'youtube' | 'instagram' | 'tiktok' | 'upload' | 'other';
export type Status = 'pending' | 'processing' | 'completed' | 'failed';

export interface TranscriptionDocument {
  sourceUrl: string | null;
  sourceType: SourceType;
  originalFilename: string | null;
  transcriptionText: string | null;
  durationSeconds: number | null;
  language: string;
  status: Status;
  errorMessage: string | null;
  createdAt: Timestamp;
  completedAt: Timestamp | null;
}

export interface TranscriptionRecord extends TranscriptionDocument {
  id: string;
}

export async function createTranscription(data: {
  sourceUrl?: string | null;
  sourceType: SourceType;
  originalFilename?: string | null;
}): Promise<string> {
  const doc: TranscriptionDocument = {
    sourceUrl: data.sourceUrl ?? null,
    sourceType: data.sourceType,
    originalFilename: data.originalFilename ?? null,
    transcriptionText: null,
    durationSeconds: null,
    language: 'en',
    status: 'processing',
    errorMessage: null,
    createdAt: Timestamp.now(),
    completedAt: null,
  };

  const docRef = await db.collection(COLLECTION).add(doc);
  return docRef.id;
}

export async function updateTranscription(
  id: string,
  data: Partial<Pick<TranscriptionDocument, 'transcriptionText' | 'status' | 'errorMessage' | 'completedAt' | 'durationSeconds'>>
): Promise<void> {
  await db.collection(COLLECTION).doc(id).update(data);
}

export async function markCompleted(id: string, transcriptionText: string, durationSeconds?: number): Promise<void> {
  await updateTranscription(id, {
    transcriptionText,
    status: 'completed',
    completedAt: Timestamp.now(),
    durationSeconds: durationSeconds ?? null,
  });
}

export async function markFailed(id: string, errorMessage: string): Promise<void> {
  await updateTranscription(id, {
    status: 'failed',
    errorMessage,
  });
}

export async function getAdminStats(adminSecret: string): Promise<{
  total: number;
  today: number;
  completed: number;
  failed: number;
  bySource: Record<string, number>;
  transcriptions: TranscriptionRecord[];
}> {
  const expectedSecret = process.env.ADMIN_SECRET;
  if (!expectedSecret || adminSecret !== expectedSecret) {
    throw new Error('Unauthorized');
  }

  const collection = db.collection(COLLECTION);

  // Get all transcriptions ordered by createdAt
  const snapshot = await collection.orderBy('createdAt', 'desc').limit(100).get();

  const transcriptions: TranscriptionRecord[] = [];
  let total = 0;
  let today = 0;
  let completed = 0;
  let failed = 0;
  const bySource: Record<string, number> = {};

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  snapshot.forEach(doc => {
    const data = doc.data() as TranscriptionDocument;
    transcriptions.push({ id: doc.id, ...data });

    total++;

    if (data.createdAt.toDate() >= todayStart) {
      today++;
    }

    if (data.status === 'completed') completed++;
    if (data.status === 'failed') failed++;

    bySource[data.sourceType] = (bySource[data.sourceType] || 0) + 1;
  });

  return { total, today, completed, failed, bySource, transcriptions };
}
