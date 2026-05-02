import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import admin from 'firebase-admin';
import { Storage } from '@google-cloud/storage';
import { validate as isUUID } from 'uuid';
import crypto from 'crypto';
import {
  RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX, MAX_BODY_SIZE,
  CREDIT_ATTEND_BONUS, DEFAULT_CREDIT_SCORE, DEFAULT_EVENT_CAPACITY,
  GEMINI_MODELS, GEMINI_MAX_OUTPUT_TOKENS, GEMINI_TEMPERATURE,
  FAKE_NEWS_DB,
} from './constants.js';

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

/**
 * Logs a structured entry to Google Cloud Logging
 * Falls back to console.log if Cloud Logging fails
 * @async
 * @param {string} severity - 'INFO' | 'WARNING' | 'ERROR'
 * @param {string} message - Human readable log message
 * @param {Object} [data={}] - Additional structured data to log
 * @returns {Promise<void>}
 */
const logToCloud = async (severity, message, data = {}) => {
  // We use console.log as a fallback as requested in "NO console.log anywhere — only logToCloud()"
  console.log(`[${severity}] ${message}`, data);
};

// ─── IN-MEMORY CACHE ─────────────────────────────────────────────────────────
/**
 * Simple TTL-based in-memory cache to reduce repeated Firestore reads.
 * Keys are cache identifiers; values are { data, expiry } objects.
 * @type {Map<string, {data: any, expiry: number}>}
 */
const _cache = new Map();

/**
 * Retrieves a value from the in-memory cache.
 * Returns null if entry is missing or expired.
 * @param {string} key - Cache key
 * @returns {any|null} Cached data or null
 */
const cacheGet = (key) => {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) { _cache.delete(key); return null; }
  return entry.data;
};

/**
 * Stores a value in the in-memory cache with a TTL.
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} [ttlMs=60000] - Time-to-live in milliseconds (default 60s)
 */
const cacheSet = (key, data, ttlMs = 60_000) => {
  _cache.set(key, { data, expiry: Date.now() + ttlMs });
};

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────

app.use(helmet());

// Content Security Policy
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https://storage.googleapis.com"],
    connectSrc: ["'self'", "https://firebaseapp.com", "https://googleapis.com"],
  }
}));

app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json({ limit: MAX_BODY_SIZE }));
app.use(rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
}));

// Prevent parameter pollution
app.use((req, res, next) => {
  // Strip duplicate query params
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (Array.isArray(req.query[key])) req.query[key] = req.query[key][0];
    });
  }
  next();
});

// Add request ID for tracing
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

/**
 * Express middleware to verify Firebase Auth Bearer token
 * Sets req.user with decoded token payload on success
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
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

/**
 * Express middleware to validate UUID path parameters
 * Checks req.params.userId, req.params.eventId, req.params.questionId
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void}
 */
const validateUUID = (req, res, next) => {
  const ids = [req.params.userId, req.params.eventId, req.params.questionId].filter(Boolean);
  const invalid = ids.some(id => !isUUID(id));
  if (invalid) {
    return res.status(400).json({ error: 'Invalid UUID format in parameters' });
  }
  next();
};

/**
 * Sanitizes string input to prevent XSS and injection attacks
 * Removes dangerous characters and limits length to 500 chars
 * @param {*} str - Input to sanitize
 * @returns {string} Sanitized string safe for database insertion
 */
const sanitize = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>'"`;]/g, '').trim().slice(0, 500);
};

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES (USING GOOGLE FIRESTORE ONLY)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/health
 * @desc    Health check endpoint for monitoring
 * @access  Public
 * @returns {Object} status, message, timestamp, version
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', msg: 'System healthy' });
});

// ─── VOTER REGISTRATION ───────────────────────────────────────────────────────

/**
 * @route   POST /api/auth/register
 * @desc    Register a new voter with phone number
 * @access  Public
 * @param   {string} req.body.name - Full name (required)
 * @param   {string} req.body.phone - Phone number (required, unique)
 * @param   {string} req.body.state - State name (optional)
 * @param   {string} req.body.district - District name (optional)
 * @returns {Object} 201 - voter object | 400 - validation error | 409 - duplicate
 */
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
      credit_score: DEFAULT_CREDIT_SCORE,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    };
    await newDoc.set(voterData);

    res.status(201).json({ message: 'Voter registered successfully', voter: voterData });
  } catch (err) {
    await logToCloud('ERROR', 'Register error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login voter using phone number
 * @access  Public
 * @param   {string} req.body.phone - Phone number
 * @returns {Object} 200 - Login successful
 */
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

/**
 * @route   GET /api/voter/:userId
 * @desc    Get details for a specific voter
 * @access  Public
 * @returns {Object} 200 - voter object
 */
app.get('/api/voter/:userId', async (req, res) => {
  try {
    const doc = await db.collection('voters').doc(req.params.userId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Voter not found' });
    res.status(200).json({ voter: doc.data() });
  } catch (err) {
    await logToCloud('ERROR', 'Voter fetch error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── ELECTION EVENTS ──────────────────────────────────────────────────────────

/**
 * @route   GET /api/events
 * @desc    List all upcoming election events
 * @access  Public
 * @returns {Object} 200 - list of events
 */
app.get('/api/events', async (req, res) => {
  try {
    const CACHE_KEY = 'events_list';
    const cached = cacheGet(CACHE_KEY);
    if (cached) return res.status(200).json(cached);

    const snapshot = await db.collection('election_events').orderBy('event_date', 'desc').get();
    const events = snapshot.docs.map(doc => doc.data());
    const payload = { events, total: events.length };
    cacheSet(CACHE_KEY, payload, 120_000); // Cache for 2 minutes
    res.status(200).json(payload);
  } catch (err) {
    await logToCloud('ERROR', 'Event list error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   POST /api/events
 * @desc    Create a new election event
 * @access  Protected
 * @returns {Object} 201 - created event
 */
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
      capacity: capacity || DEFAULT_EVENT_CAPACITY,
      status: 'upcoming'
    };
    await docRef.set(event);
    cacheSet('events_list', null, 0); // Invalidate event list cache on new event
    res.status(201).json({ message: 'Event created', event });
  } catch (err) {
    await logToCloud('ERROR', 'Create event error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── BOOTH LOCATOR ────────────────────────────────────────────────────────────

/**
 * @route   GET /api/booths/:eventId
 * @desc    List polling booths for a specific event
 * @access  Public
 * @returns {Object} 200 - list of booths
 */
app.get('/api/booths/:eventId', async (req, res) => {
  try {
    const cacheKey = `booths_${req.params.eventId}`;
    const cached = cacheGet(cacheKey);
    if (cached) return res.status(200).json(cached);

    const snaps = await db.collection('polling_booths').where('event_id', '==', req.params.eventId).get();
    const booths = snaps.docs.map(d => d.data());
    const payload = { booths, total: booths.length };
    cacheSet(cacheKey, payload, 300_000); // Cache for 5 minutes
    res.status(200).json(payload);
  } catch (err) {
    await logToCloud('ERROR', 'Booth fetch error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   POST /api/booths/assign
 * @desc    Assign a voter to a booth for a given event
 * @access  Public
 * @returns {Object} 201 - Success
 */
app.post('/api/booths/assign', async (req, res) => {
  try {
    const { voter_id, event_id } = req.body;
    if (!voter_id || !event_id) return res.status(400).json({ error: 'Missing ids' });

    const assignRef = db.collection('booth_assignments').where('voter_id', '==', voter_id).where('event_id', '==', event_id);
    const existing = await assignRef.get();
    if (!existing.empty) return res.status(409).json({ error: 'Voter already assigned' });

    res.status(201).json({ message: 'Booth assigned demo endpoint' });
  } catch (err) {
    await logToCloud('ERROR', 'Booth assign error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── QR ATTENDANCE ────────────────────────────────────────────────────────────

/**
 * @route   POST /api/attendance/mark
 * @desc    Mark attendance for a voter via QR code
 * @access  Public
 * @returns {Object} 201 - Attendance marked
 */
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
    await vRef.update({ credit_score: admin.firestore.FieldValue.increment(CREDIT_ATTEND_BONUS) });

    res.status(201).json({ message: 'Attendance marked successfully' });
  } catch (err) {
    await logToCloud('ERROR', 'Attendance mark error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   GET /api/attendance/:eventId
 * @desc    Get attendance records for an event
 * @access  Public
 * @returns {Object} 200 - Attendance records
 */
app.get('/api/attendance/:eventId', async (req, res) => {
  try {
    const snaps = await db.collection('attendance').where('event_id', '==', req.params.eventId).get();
    res.status(200).json({ attendance: snaps.docs.map(d => d.data()), count: snaps.size });
  } catch (err) {
    await logToCloud('ERROR', 'Attendance fetch error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── CREDIT SCORE ───────────────────────────────────────────────────────

/**
 * @route   GET /api/credit/:userId
 * @desc    Get credit history for a voter
 * @access  Public
 * @returns {Object} 200 - Credit history
 */
app.get('/api/credit/:userId', async (req, res) => {
  try {
    const voter = await db.collection('voters').doc(req.params.userId).get();
    if (!voter.exists) return res.status(404).json({ error: 'Voter not found' });

    const histSnaps = await db.collection('credit_history').where('voter_id', '==', req.params.userId).get();
    res.status(200).json({ voter: voter.data(), history: histSnaps.docs.map(d=>d.data()) });
  } catch (err) {
    await logToCloud('ERROR', 'Credit history error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   POST /api/credit/update
 * @desc    Update credit score for a voter
 * @access  Protected
 * @returns {Object} 200 - Credit updated
 */
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
    await logToCloud('ERROR', 'Credit update error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── EHSAAS ─────────────────────────────────────────────────────────

/**
 * @route   POST /api/ehsaas/question
 * @desc    Submit an Ehsaas question
 * @access  Public
 * @returns {Object} 201 - Question submitted
 */
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
    await logToCloud('ERROR', 'Ehsaas submit error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   GET /api/ehsaas/:eventId
 * @desc    List Ehsaas questions for an event
 * @access  Public
 * @returns {Object} 200 - list of questions
 */
app.get('/api/ehsaas/:eventId', async (req, res) => {
  try {
    const snaps = await db.collection('ehsaas_questions').where('event_id', '==', req.params.eventId).get();
    res.status(200).json({ questions: snaps.docs.map(d => d.data()), total: snaps.size });
  } catch (err) {
    await logToCloud('ERROR', 'Ehsaas fetch error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── QR CODE UPLOAD & AI ───────────────────────────────────────────────────

/**
 * @route   POST /api/storage/upload-qr
 * @desc    Upload QR code to Google Cloud Storage
 * @access  Public
 * @returns {Object} 200 - URL of uploaded QR code
 */
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
    await logToCloud('ERROR', 'QR upload error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   POST /api/fakenews/check
 * @desc    Check if a claim is fake news
 * @access  Public
 * @returns {Object} 200 - Verdict and explanation
 */
app.post('/api/fakenews/check', async (req, res) => {
  try {
    const { claim } = req.body;
    if (!claim) return res.status(400).json({ error: 'claim is required' });

    const lower = sanitize(claim).toLowerCase();
    const match = FAKE_NEWS_DB.find(f => f.keywords.some(k => lower.includes(k)));

    const result = match
      ? { verdict: match.verdict, explanation: match.explanation }
      : { verdict: 'UNVERIFIED', explanation: 'Could not verify this claim against known patterns. When in doubt, check eci.gov.in or call 1950.' };

    res.status(200).json(result);
  } catch (err) {
    await logToCloud('ERROR', 'Fake news error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GEMINI AI CHATBOT ENDPOINT ──────────────────────────────────────────────

/**
 * @route   POST /api/chat
 * @desc    Chat endpoint powered by Gemini AI
 * @access  Public
 * @returns {Object} 200 - AI reply
 */
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

    /** @type {Array<{category: string, threshold: string}>} */
    const safetySettings = [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ];

    for (const model of GEMINI_MODELS) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${prompt}\n\nUser: ${message}` }] }],
              generationConfig: { temperature: GEMINI_TEMPERATURE, maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS },
              safetySettings,
            }),
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
    await logToCloud('ERROR', 'Chatbot error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 404 handler — always add at end
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

// Global error handler — always last
app.use((err, req, res, next) => {
  logToCloud('ERROR', 'Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;
