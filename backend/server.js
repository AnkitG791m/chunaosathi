import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import admin from 'firebase-admin';
import { Storage } from '@google-cloud/storage';
import { validate as isUUID, v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 8080;

// ─── FIREBASE ADMIN (Firestore & Auth) ──────────────────────────────────
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID
  });
}
const db = admin.firestore();

// ─── GOOGLE CLOUD STORAGE ────────────────────────────────────────────────────
const storage = new Storage({ projectId: process.env.GOOGLE_CLOUD_PROJECT });
const bucket = storage.bucket(process.env.GCS_BUCKET || 'chunao-saathi-storage');

// ─── CUSTOM LOGGING ─────────────────────────────────────────────────────────
const logToCloud = async (severity, message, data = {}) => {
  console.log(`[${severity}] ${message}`, data);
  // Optional: Connect to Google Cloud Logging if needed later
};

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
}));

// ─── FIREBASE TOKEN VERIFIER ──────────────────────────────────────────────────
const verifyToken = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  try {
    const token = header.split('Bearer ')[1];
    req.user = await admin.auth().verifyIdToken(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

const sanitize = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>'"`;]/g, '').trim().slice(0, 500);
};

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES (USING GOOGLE FIRESTORE ONLY)
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', msg: 'System healthy' });
});

// ─── VOTER REGISTRATION ───────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, phone, state, district } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'name and phone are required' });

    const cleanPhone = sanitize(phone);
    const votersRef = db.collection('voters');
    const existing = await votersRef.where('phone', '==', cleanPhone).get();
    
    if (!existing.empty) return res.status(409).json({ error: 'Phone already registered' });

    const newDoc = votersRef.doc();
    const voterData = {
      id: newDoc.id,
      name: sanitize(name),
      phone: cleanPhone,
      state: sanitize(state || ''),
      district: sanitize(district || ''),
      credit_score: 100,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    };
    await newDoc.set(voterData);

    res.status(201).json({ message: 'Voter registered successfully', voter: voterData });
  } catch (err) {
    await logToCloud('ERROR', 'Register error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'phone is required' });

    const result = await db.collection('voters').where('phone', '==', sanitize(phone)).limit(1).get();
    if (result.empty) return res.status(404).json({ error: 'Voter not found' });

    res.status(200).json({ message: 'Login successful', voter: result.docs[0].data() });
  } catch (err) {
    await logToCloud('ERROR', 'Login error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/voter/:userId', async (req, res) => {
  try {
    const doc = await db.collection('voters').doc(req.params.userId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Voter not found' });
    res.status(200).json({ voter: doc.data() });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── ELECTION EVENTS ──────────────────────────────────────────────────────────
app.get('/api/events', async (req, res) => {
  try {
    const snapshot = await db.collection('election_events').orderBy('event_date', 'desc').get();
    const events = snapshot.docs.map(doc => doc.data());
    res.status(200).json({ events, total: events.length });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/events', verifyToken, async (req, res) => {
  try {
    const { name, event_date, venue, state, capacity } = req.body;
    if (!name || !event_date || !venue) return res.status(400).json({ error: 'Missing fields' });

    const docRef = db.collection('election_events').doc();
    const event = {
      id: docRef.id,
      name: sanitize(name),
      event_date,
      venue: sanitize(venue),
      state: sanitize(state || ''),
      capacity: capacity || 500,
      status: 'upcoming'
    };
    await docRef.set(event);
    res.status(201).json({ message: 'Event created', event });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── BOOTH LOCATOR ────────────────────────────────────────────────────────────
app.get('/api/booths/:eventId', async (req, res) => {
  try {
    const snaps = await db.collection('polling_booths').where('event_id', '==', req.params.eventId).get();
    const booths = snaps.docs.map(d => d.data());
    res.status(200).json({ booths, total: booths.length });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/booths/assign', async (req, res) => {
  try {
    const { voter_id, event_id } = req.body;
    if (!voter_id || !event_id) return res.status(400).json({ error: 'Missing ids' });

    const assignRef = db.collection('booth_assignments').where('voter_id', '==', voter_id).where('event_id', '==', event_id);
    const existing = await assignRef.get();
    if (!existing.empty) return res.status(409).json({ error: 'Voter already assigned' });

    res.status(201).json({ message: 'Booth assigned demo endpoint' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── QR ATTENDANCE ────────────────────────────────────────────────────────────
app.post('/api/attendance/mark', async (req, res) => {
  try {
    const { qr_code, event_id } = req.body;
    if (!qr_code || !event_id) return res.status(400).json({ error: 'Missing fields' });

    const voterSnap = await db.collection('voters').where('qr_code', '==', sanitize(qr_code)).get();
    if (voterSnap.empty) return res.status(404).json({ error: 'Invalid QR code' });
    
    const voterData = voterSnap.docs[0].data();
    
    const attendRef = db.collection('attendance').where('voter_id', '==', voterData.id).where('event_id', '==', event_id);
    const existing = await attendRef.get();
    if (!existing.empty) return res.status(409).json({ error: 'Attendance already marked' });

    const newAttend = db.collection('attendance').doc();
    await newAttend.set({
      id: newAttend.id,
      voter_id: voterData.id,
      event_id,
      marked_at: admin.firestore.FieldValue.serverTimestamp()
    });

    const vRef = db.collection('voters').doc(voterData.id);
    await vRef.update({ credit_score: admin.firestore.FieldValue.increment(10) });

    res.status(201).json({ message: 'Attendance marked successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/attendance/:eventId', async (req, res) => {
  try {
    const snaps = await db.collection('attendance').where('event_id', '==', req.params.eventId).get();
    res.status(200).json({ attendance: snaps.docs.map(d => d.data()), count: snaps.size });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── CREDIT SCORE ───────────────────────────────────────────────────────
app.get('/api/credit/:userId', async (req, res) => {
  try {
    const voter = await db.collection('voters').doc(req.params.userId).get();
    if (!voter.exists) return res.status(404).json({ error: 'Voter not found' });

    const histSnaps = await db.collection('credit_history').where('voter_id', '==', req.params.userId).get();
    res.status(200).json({ voter: voter.data(), history: histSnaps.docs.map(d=>d.data()) });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/credit/update', verifyToken, async (req, res) => {
  try {
    const { voter_id, change_amount, reason } = req.body;
    if (!voter_id || change_amount === undefined || !reason) return res.status(400).json({ error: 'Missing fields' });

    const vRef = db.collection('voters').doc(voter_id);
    await vRef.update({ credit_score: admin.firestore.FieldValue.increment(change_amount) });

    await db.collection('credit_history').add({
      voter_id, change_amount, reason: sanitize(reason), created_at: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({ message: 'Credit updated' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── EHSAAS ─────────────────────────────────────────────────────────
app.post('/api/ehsaas/question', async (req, res) => {
  try {
    const { question, event_id, category } = req.body;
    if (!question || !event_id) return res.status(400).json({ error: 'Missing fields' });

    const docRef = db.collection('ehsaas_questions').doc();
    const qData = {
      id: docRef.id, question: sanitize(question), event_id, category: sanitize(category || 'general'),
      status: 'pending', created_at: admin.firestore.FieldValue.serverTimestamp()
    };
    await docRef.set(qData);
    res.status(201).json({ message: 'Question submitted', question: qData });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/ehsaas/:eventId', async (req, res) => {
  try {
    const snaps = await db.collection('ehsaas_questions').where('event_id', '==', req.params.eventId).get();
    res.status(200).json({ questions: snaps.docs.map(d => d.data()), total: snaps.size });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── QR CODE UPLOAD & AI ───────────────────────────────────────────────────
app.post('/api/storage/upload-qr', async (req, res) => {
  try {
    const { voter_id, qr_data } = req.body;
    if (!voter_id || !qr_data) return res.status(400).json({ error: 'Missing fields' });

    const buffer = Buffer.from(qr_data.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const fileName = `qr-codes/${voter_id}.png`;
    const file = bucket.file(fileName);

    await file.save(buffer, { metadata: { contentType: 'image/png' }, resumable: false });
    const publicUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET}/${fileName}`;

    await db.collection('voters').doc(voter_id).update({ qr_url: publicUrl });
    res.status(200).json({ message: 'QR code uploaded', url: publicUrl });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/fakenews/check', async (req, res) => {
  try {
    const { claim } = req.body;
    if (!claim) return res.status(400).json({ error: 'claim is required' });

    const FAKE_NEWS_DB = [
      { keywords: ['evm', 'hack', 'rigged'], verdict: 'FALSE', explanation: 'EVMs are standalone machines.' },
      { keywords: ['nota', 'useless'], verdict: 'FALSE', explanation: 'NOTA is a constitutional right.' },
    ];
    const lower = sanitize(claim).toLowerCase();
    const match = FAKE_NEWS_DB.find(f => f.keywords.some(k => lower.includes(k)));

    if (match) {
      res.status(200).json({ verdict: match.verdict, explanation: match.explanation });
    } else {
      res.status(200).json({ verdict: 'UNVERIFIED', explanation: 'Could not verify claim.' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GEMINI AI CHATBOT ENDPOINT ──────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  try {
    const { message, lang = 'hi', systemPrompt } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) return res.status(500).json({ error: 'Gemini API not configured on server' });

    const prompt = systemPrompt || `You are Chunao Saathi — an AI assistant for Indian election education.
Answer in the same language as the question (Hindi/English/Hinglish).
Topics: voting process, voter ID, EVM, NOTA, booth location, voter rights.
Never discuss political parties or candidates.
Keep answers under 5 lines. Be encouraging about civic duty.`;

    const models = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'];

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${prompt}\n\nUser: ${message}` }] }],
              generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
              safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
              ]
            })
          }
        );
        const data = await response.json();
        if (data.error) {
          if (data.error.code === 429 || data.error.code === 404) continue;
          return res.status(500).json({ error: data.error.message });
        }
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return res.status(200).json({ reply: text, model });
      } catch {
        continue;
      }
    }

    // All models exhausted — return helpful static info
    const staticReply = lang === 'hi'
      ? `🗳️ मतदान जानकारी:\n📋 सुबह 7 बजे से शाम 6 बजे अपने मतदान केंद्र पर जाएं।\n🪪 मतदाता ID या आधार कार्ड साथ लाएं।\n📞 ECI हेल्पलाइन: 1950`
      : `🗳️ Voting Info:\n📋 Visit your booth 7AM–6PM.\n🪪 Bring Voter ID or Aadhaar.\n📞 ECI Helpline: 1950`;
    res.status(200).json({ reply: staticReply, model: 'static' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});


if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;
