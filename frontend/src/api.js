// frontend/src/api.js
// Chunao Saathi — Smart Chatbot with AI + Offline Fallback

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// ─── SIMPLE IN-MEMORY RESPONSE CACHE ─────────────────────────────────────────
/** @type {Map<string, {data: any, expiry: number}>} */
const _apiCache = new Map();

/**
 * Gets a cached API response.
 * @param {string} key
 * @returns {any|null}
 */
const apiCacheGet = (key) => {
  const entry = _apiCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) { _apiCache.delete(key); return null; }
  return entry.data;
};

/**
 * Stores an API response in cache.
 * @param {string} key
 * @param {any} data
 * @param {number} [ttlMs=30000] - 30 seconds default
 */
const apiCacheSet = (key, data, ttlMs = 30_000) => {
  _apiCache.set(key, { data, expiry: Date.now() + ttlMs });
};

/** @type {Map<string, Promise<any>>} Deduplicates concurrent identical requests */
const _inFlight = new Map();

/**
 * Core fetch wrapper with error handling.
 * @param {string} endpoint - API path
 * @param {RequestInit} [options={}]
 * @returns {Promise<any>}
 */
const fetchAPI = async (endpoint, options = {}) => {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API error');
  return data;
};

/**
 * Fetch with in-flight deduplication — prevents duplicate GET requests.
 * @param {string} endpoint
 * @returns {Promise<any>}
 */
const fetchDeduped = (endpoint) => {
  const cached = apiCacheGet(endpoint);
  if (cached) return Promise.resolve(cached);

  if (_inFlight.has(endpoint)) return _inFlight.get(endpoint);

  const promise = fetchAPI(endpoint)
    .then((data) => {
      apiCacheSet(endpoint, data);
      return data;
    })
    .finally(() => _inFlight.delete(endpoint));

  _inFlight.set(endpoint, promise);
  return promise;
};

// ─── OFFLINE ELECTION KNOWLEDGE BASE ─────────────────────────────────────────
// Used when API quota is exhausted — gives real, accurate answers
const KB = {
  hi: [
    {
      keys: ['nota', 'none of the above', 'नोटा'],
      answer: `🗳️ **NOTA (None Of The Above)** का मतलब है "उपरोक्त में से कोई नहीं"।\n\n• यह 2013 से भारतीय चुनावों में उपलब्ध है।\n• EVM पर सबसे नीचे NOTA का बटन होता है।\n• यह आपका संवैधानिक अधिकार है — कोई भी उम्मीदवार पसंद न हो तो NOTA दबाएं।\n• NOTA चुनाव को रद्द नहीं करता, लेकिन यह एक शक्तिशाली संदेश है।`
    },
    {
      keys: ['evm', 'ईवीएम', 'इलेक्ट्रॉनिक'],
      answer: `⚡ **EVM (Electronic Voting Machine)** जानकारी:\n\n• EVM दो इकाइयों से बनी है: Control Unit और Balloting Unit।\n• यह पूरी तरह standalone है — इसे internet, bluetooth से हैक नहीं किया जा सकता।\n• Balloting Unit पर उम्मीदवार का नाम और पार्टी चिह्न होता है।\n• वोट देने के बाद VVPAT पर्ची से पुष्टि करें।`
    },
    {
      keys: ['vvpat', 'वीवीपैट', 'पर्ची'],
      answer: `🧾 **VVPAT (Voter Verifiable Paper Audit Trail)**:\n\n• वोट देने के बाद एक कागज़ की पर्ची 7 सेकंड के लिए दिखती है।\n• इससे आप पुष्टि कर सकते हैं कि वोट सही उम्मीदवार को गया।\n• पर्ची पर उम्मीदवार का नाम और चिह्न होता है।\n• यह पर्ची EVM से अलग सुरक्षित बॉक्स में जाती है।`
    },
    {
      keys: ['वोट', 'vote', 'मतदान कैसे', 'how to vote', 'voting process', 'मतदान प्रक्रिया'],
      answer: `🗳️ **मतदान प्रक्रिया — 5 आसान कदम:**\n\n1️⃣ **नाम जांचें** — electoralsearch.eci.gov.in पर\n2️⃣ **बूथ खोजें** — EPIC नंबर से SMS करें 1950 पर\n3️⃣ **दस्तावेज़ लाएं** — Voter ID, Aadhaar या कोई फोटो ID\n4️⃣ **सत्यापन** — अधिकारी नाम जाँचेगा, उंगली पर स्याही लगाएगा\n5️⃣ **वोट डालें** — EVM बटन दबाएं, बीप सुनें, VVPAT देखें`
    },
    {
      keys: ['voter id', 'voter card', 'epic', 'मतदाता पहचान', 'पहचान पत्र', 'id card'],
      answer: `🪪 **मतदाता पहचान पत्र (EPIC) जानकारी:**\n\n• EPIC = Electoral Photo Identity Card\n• eci.gov.in पर ऑनलाइन apply कर सकते हैं\n• Voter Helpline App से भी बना सकते हैं\n• अगर EPIC न हो तो: Aadhaar, PAN, Passport, Driving License, Passbook भी मान्य हैं\n• खोया हो तो: voterportal.eci.gov.in पर duplicate apply करें`
    },
    {
      keys: ['booth', 'बूथ', 'polling station', 'मतदान केंद्र', 'kahan', 'कहाँ'],
      answer: `📍 **मतदान बूथ कैसे पता करें:**\n\n• हमारे ऐप का 📍 **Booth Finder** tab उपयोग करें\n• SMS करें: EPIC नंबर को 1950 पर\n• electoralsearch.eci.gov.in पर जाएं\n• Voter Helpline App download करें\n• मतदान केंद्र समय: सुबह **7 बजे से शाम 6 बजे** तक`
    },
    {
      keys: ['age', 'उम्र', 'आयु', 'eligibility', 'योग्यता', 'कौन वोट'],
      answer: `✅ **मतदान योग्यता:**\n\n• उम्र: **18 वर्ष या उससे अधिक** (1 जनवरी की कट-ऑफ)\n• भारत का नागरिक होना जरूरी\n• मतदाता सूची में नाम होना जरूरी\n• कोई भी मानसिक रूप से स्वस्थ नागरिक जो अपराधी न हो\n• 18 साल होने पर voterportal.eci.gov.in पर register करें`
    },
    {
      keys: ['eci', 'election commission', 'निर्वाचन आयोग', 'चुनाव आयोग'],
      answer: `🏛️ **भारत निर्वाचन आयोग (ECI):**\n\n• स्थापना: **25 जनवरी 1950** (राष्ट्रीय मतदाता दिवस)\n• यह एक स्वतंत्र संवैधानिक संस्था है\n• लोकसभा, विधानसभा, राज्यसभा चुनाव आयोजित करती है\n• वेबसाइट: eci.gov.in\n• हेल्पलाइन: **1950** (24×7 निःशुल्क)`
    },
    {
      keys: ['migrant', 'प्रवासी', 'अन्य राज्य', 'different state', 'bahar'],
      answer: `🚆 **प्रवासी मतदाता अधिकार:**\n\n• आप केवल उसी constituency में वोट दे सकते हैं जहाँ registered हैं\n• नए शहर में रहते हैं? voterportal.eci.gov.in पर address transfer करें\n• Form 8A भरें address change के लिए\n• Online/Remote voting अभी भारत में उपलब्ध नहीं है`
    },
  ],
  en: [
    {
      keys: ['nota', 'none of the above'],
      answer: `🗳️ **NOTA (None Of The Above):**\n\n• Available in Indian elections since 2013.\n• It's the last option at the bottom of the EVM.\n• Your constitutional right if you don't prefer any candidate.\n• NOTA doesn't cancel the election but sends a strong message.\n• The candidate with most votes still wins.`
    },
    {
      keys: ['evm', 'electronic voting machine'],
      answer: `⚡ **EVM (Electronic Voting Machine):**\n\n• Consists of Control Unit + Balloting Unit.\n• Completely standalone — cannot be hacked via internet/bluetooth.\n• Shows candidate names and party symbols.\n• After voting, verify your vote using the VVPAT slip.\n• EVMs have been used since 1982 in India.`
    },
    {
      keys: ['vote', 'voting', 'how to vote', 'voting process'],
      answer: `🗳️ **How to Vote — 5 Easy Steps:**\n\n1️⃣ **Check Name** — at electoralsearch.eci.gov.in\n2️⃣ **Find Booth** — SMS EPIC number to 1950\n3️⃣ **Bring ID** — Voter ID, Aadhaar or any photo ID\n4️⃣ **Verification** — Official checks name, inks finger\n5️⃣ **Cast Vote** — Press button on EVM, hear beep, check VVPAT`
    },
    {
      keys: ['voter id', 'epic', 'voter card', 'id card'],
      answer: `🪪 **Voter ID Card (EPIC) Info:**\n\n• Apply at voterportal.eci.gov.in or Voter Helpline App\n• Alternative valid IDs: Aadhaar, PAN, Passport, Driving License, Passbook\n• Lost your card? Apply for duplicate at voterportal.eci.gov.in\n• EPIC is the preferred ID for voting.`
    },
    {
      keys: ['booth', 'polling station', 'where to vote'],
      answer: `📍 **Find Your Polling Booth:**\n\n• Use our 📍 **Booth Finder** tab in this app\n• SMS your EPIC number to **1950**\n• Visit electoralsearch.eci.gov.in\n• Download the Voter Helpline App\n• Polling hours: **7 AM to 6 PM**`
    },
    {
      keys: ['age', 'eligibility', 'who can vote', 'qualification'],
      answer: `✅ **Voter Eligibility:**\n\n• Age: **18 years or above** (Jan 1 cut-off date)\n• Must be an Indian citizen\n• Must be enrolled in the electoral roll\n• Register at voterportal.eci.gov.in when you turn 18\n• Anyone of sound mind who is not a criminal can vote.`
    },
    {
      keys: ['eci', 'election commission'],
      answer: `🏛️ **Election Commission of India (ECI):**\n\n• Established: **January 25, 1950** (National Voters' Day)\n• Independent constitutional body\n• Conducts Lok Sabha, Vidhan Sabha, Rajya Sabha elections\n• Website: eci.gov.in | Helpline: **1950** (24×7 Free)`
    },
  ]
};

const matchKB = (message, lang) => {
  const lower = message.toLowerCase();
  const entries = KB[lang] || KB.hi;
  for (const entry of entries) {
    if (entry.keys.some(k => lower.includes(k))) {
      return entry.answer;
    }
  }
  return null;
};

// ─── MAIN API EXPORT ──────────────────────────────────────────────────────────
export const API = {
  health: () => fetchDeduped('/api/health'),
  register: (name, phone, state, district) =>
    fetchAPI('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, phone, state, district }) }),
  login: (phone) =>
    fetchAPI('/api/auth/login', { method: 'POST', body: JSON.stringify({ phone }) }),
  getEvents: () => fetchDeduped('/api/events'),
  getBooths: (eventId) => fetchDeduped(`/api/booths/${eventId}`),
  markAttendance: (qrCode, eventId) =>
    fetchAPI('/api/attendance/mark', { method: 'POST', body: JSON.stringify({ qr_code: qrCode, event_id: eventId }) }),
  getCredit: (userId) => fetchDeduped(`/api/credit/${userId}`),
  submitQuestion: (question, eventId, category) =>
    fetchAPI('/api/ehsaas/question', { method: 'POST', body: JSON.stringify({ question, event_id: eventId, category }) }),
  getQuestions: (eventId) => fetchDeduped(`/api/ehsaas/${eventId}`),
  checkFakeNews: (claim) =>
    fetchAPI('/api/fakenews/check', { method: 'POST', body: JSON.stringify({ claim }) }),

  /**
   * Smart Chatbot:
   * 1. Try Gemini AI directly (with 8s timeout per model)
   * 2. Try backend proxy
   * 3. Match offline knowledge base
   * 4. Return helpful static fallback
   * @param {string} message - User message
   * @param {'hi'|'en'} [lang='hi'] - Language
   * @returns {Promise<string>} AI or fallback response
   */
  chatbot: async (message, lang = 'hi') => {
    const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;

    const systemPrompt = lang === 'hi'
      ? `आप चुनाव साथी हैं — भारतीय चुनाव शिक्षा AI। हिंदी/English में जवाब दें। विषय: मतदान, EVM, NOTA, voter ID, बूथ। राजनीतिक दलों पर कोई टिप्पणी नहीं। 4-5 पंक्तियों में जवाब।`
      : `You are Chunao Saathi — Indian election education AI. Answer in Hindi/English. Topics: voting, EVM, NOTA, voter ID, booths. No political commentary. Keep under 5 lines.`;

    /** Reusable safety settings (defined once, not per-iteration) */
    const safetySettings = [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ];

    const MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'];
    const GEMINI_TIMEOUT_MS = 8_000;

    // ── STEP 1: Try Gemini AI directly ───────────────────────────
    if (GEMINI_KEY?.startsWith('AIzaSy')) {
      for (const model of MODELS) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
            {
              method: 'POST',
              signal: controller.signal,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: `${systemPrompt}\n\nUser: ${message}` }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
                safetySettings,
              }),
            }
          );
          clearTimeout(timer);
          const data = await res.json();
          if (data.error?.code === 429 || data.error?.code === 404) continue;
          if (data.error) break;
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text;
        } catch { continue; }
      }
    }

    // ── STEP 2: Try backend proxy ─────────────────────────────────
    try {
      const result = await fetchAPI('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message, lang })
      });
      if (result.reply && result.model !== 'static') return result.reply;
    } catch { /* backend down */ }

    // ── STEP 3: Offline knowledge base match ─────────────────────
    const kbAnswer = matchKB(message, lang);
    if (kbAnswer) return kbAnswer;

    // ── STEP 4: Final generic fallback ────────────────────────────
    return lang === 'hi'
      ? `🗳️ मैं आपकी मदद करने की कोशिश कर रहा हूँ!\n\n**अक्सर पूछे जाने वाले सवाल:**\n• **वोट कैसे डालें?** → सुबह 7-शाम 6 बजे अपने बूथ पर जाएं\n• **NOTA?** → उपरोक्त में से कोई नहीं (EVM पर अंतिम विकल्प)\n• **बूथ कहाँ है?** → 📍 Booth Finder tab देखें\n• **हेल्पलाइन:** 📞 **1950** (निःशुल्क)`
      : `🗳️ Here's key election information:\n\n• **How to vote?** → Visit your booth 7AM–6PM with valid ID\n• **NOTA?** → None Of The Above (last option on EVM)\n• **Find booth?** → Use 📍 Booth Finder tab\n• **ECI Helpline:** 📞 **1950** (Free)`;
  },
};
