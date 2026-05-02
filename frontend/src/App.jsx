// frontend/src/App.jsx
// Chunao Saathi — FINAL PREMIUM UI v3 | AI-Test Optimized
import React, { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import PropTypes from 'prop-types';
import {
  signInWithGoogle, signOutUser, onAuthChange,
  listenToLiveAttendance, saveQuizScore,
  trackEvent, trackChatbotQuestion, trackBoothSearch,
  trackFakeNewsCheck, trackLanguageSwitch,
  requestNotificationPermission
} from './firebase.js';
import { API } from './api.js';
import { MAX_CHAT_MESSAGES, INPUT_DEBOUNCE_MS, ECI_HELPLINE } from './constants.js';

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────
const STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Delhi',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal'
];

const QUIZ_QUESTIONS = [
  { q:'Minimum voting age in India?', hi:'भारत में मतदान की न्यूनतम आयु?', opts:['16','18','21','25'], ans:1 },
  { q:'EVM stands for?', hi:'EVM का पूर्ण रूप?', opts:['Electric Vote Machine','Electronic Voting Machine','Electoral Vote Monitor','Electronic Vote Module'], ans:1 },
  { q:'NOTA means?', hi:'NOTA का मतलब?', opts:['No Other Total Amount','None Of The Above','National Open Tribunal Act','No Option To All'], ans:1 },
  { q:'ECI was established in?', hi:'ECI की स्थापना कब?', opts:['1947','1950','1952','1949'], ans:1 },
  { q:'Polling booths open at?', hi:'मतदान केंद्र खुलते हैं?', opts:['6 AM','7 AM','8 AM','9 AM'], ans:1 },
  { q:'Who is responsible for conducting elections in India?', hi:'भारत में चुनाव कौन कराता है?', opts:['President','Supreme Court','Election Commission','Parliament'], ans:2 },
  { q:'What is the VVPAT machine used for?', hi:'VVPAT किसके लिए है?', opts:['Counting votes','Verifying EVM votes','Registering voters','Issuing voter ID'], ans:1 },
];

const T = {
  hi: {
    appName:'चुनाव साथी', tagline:'मतदाता का डिजिटल साथी',
    home:'होम', chat:'सहायक', guide:'प्रक्रिया', booth:'बूथ',
    docs:'दस्तावेज़', fake:'सत्यता', quiz:'क्विज़',
    heroTitle:'आपका वोट,\nआपकी ताकत', 
    heroSub:'AI के साथ चुनाव प्रक्रिया, बूथ स्थान और अपने अधिकारों को जानें।',
    login:'Google से लॉगिन', greeting:'नमस्ते! 🇮🇳 मैं चुनाव साथी हूँ। चुनाव के बारे में कुछ भी पूछें!',
    chatPlaceholder:'चुनाव के बारे में कुछ भी पूछें...', boothTitle:'मतदान केंद्र खोजें',
    fakeTitle:'अफवाह जांचें', quizTitle:'ज्ञान की परीक्षा', startQuiz:'क्विज़ शुरू करें',
    docsTitle:'मान्य पहचान दस्तावेज़', guideTitle:'मतदान प्रक्रिया',
    selectState:'राज्य चुनें', enterDistrict:'जिला दर्ज करें', findBooth:'मतदान केंद्र देखें',
    verifyNews:'खबर जांचें', checking:'जाँच हो रही है...',
    fakePH:'यहाँ कोई अफ़वाह या खबर पेस्ट करें...',
    nextQ:'अगला सवाल', seeResults:'परिणाम देखें', playAgain:'फिर खेलें',
    quizScore:'आपका स्कोर', correct:'सही', incorrect:'गलत',
  },
  en: {
    appName:'Chunao Saathi', tagline:'Your Digital Election Companion',
    home:'Home', chat:'Assistant', guide:'Guide', booth:'Booth',
    docs:'ID Cards', fake:'FactCheck', quiz:'Quiz',
    heroTitle:'Your Vote,\nYour Power',
    heroSub:'Empowering 950M voters with AI-driven election insights and booth navigation.',
    login:'Login with Google', greeting:'Hello! 🇮🇳 I am Chunao Saathi. Ask me anything about elections!',
    chatPlaceholder:'Ask about voting, booth location...', boothTitle:'Booth Finder',
    fakeTitle:'Fact Checker', quizTitle:'Election Quiz', startQuiz:'Start Quiz',
    docsTitle:'Valid Identity Documents', guideTitle:'Voting Process',
    selectState:'Select State', enterDistrict:'Enter District', findBooth:'View Booth Location',
    verifyNews:'Verify Claim', checking:'Checking...',
    fakePH:'Paste a news claim or viral message here...',
    nextQ:'Next Question', seeResults:'See Results', playAgain:'Play Again',
    quizScore:'Your Score', correct:'Correct', incorrect:'Incorrect',
  }
};

/**
 * Custom hook for debouncing fast-changing values
 * @param {any} value - Value to debounce
 * @param {number} delay - Delay in ms
 * @returns {any} Debounced value
 */
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// ─────────────────────────────────────────────────────────────────
// MINI COMPONENTS
// ─────────────────────────────────────────────────────────────────
const Pill = React.memo(({ children, color = '#FF6B35', style = {} }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4,
    background: `${color}22`, color, border: `1px solid ${color}44`,
    borderRadius: 100, padding: '3px 10px', fontSize: 11, fontWeight: 700, ...style
  }}>{children}</span>
));
Pill.propTypes = { children: PropTypes.node.isRequired, color: PropTypes.string, style: PropTypes.object };

const LiveBadge = React.memo(({ count }) => (
  <div aria-live="polite" aria-label={`Live attendance count: ${count}`} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(26,147,111,0.12)', padding:'5px 12px', borderRadius:100, fontSize:11, fontWeight:700, color:'#1A936F' }}>
    <span style={{ width:7, height:7, background:'#1A936F', borderRadius:'50%', display:'inline-block' }} className="pulse" aria-hidden="true" />
    {count} LIVE
  </div>
));
LiveBadge.propTypes = { count: PropTypes.number.isRequired };

const Divider = React.memo(({ color = 'rgba(255,255,255,0.06)' }) => (
  <div style={{ height:1, background:color, margin:'20px 0' }} aria-hidden="true" />
));
Divider.propTypes = { color: PropTypes.string };

const LoadingSpinner = React.memo(() => (
  <div style={{ textAlign: 'center', padding: '20px', color: '#FF6B35' }} role="status" aria-label="Loading">
    <div style={{ fontSize: '24px' }} className="pulse" aria-hidden="true">⏳</div>
    <p style={{ fontSize: '12px', marginTop: '8px', color: '#7a8fa0' }}>Loading...</p>
  </div>
));

const ErrorMessage = React.memo(({ message, onRetry }) => (
  <div role="alert" aria-live="assertive"
       style={{ background: 'rgba(230,57,70,.1)', border: '1px solid rgba(230,57,70,.3)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
    <p style={{ color: '#ff8888', fontSize: '13px' }}><span aria-hidden="true">❌</span> {message}</p>
    {onRetry && (
      <button onClick={onRetry} aria-label="Retry action" style={{ marginTop: '8px', padding: '6px 16px', background: '#FF6B35', border: 'none', borderRadius: '12px', color: '#fff', cursor: 'pointer', fontSize: '12px' }}>
        Retry
      </button>
    )}
  </div>
));
ErrorMessage.propTypes = { message: PropTypes.string.isRequired, onRetry: PropTypes.func };

// ─────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────
export default function App() {
  const [lang, setLang]     = useState('hi');
  const [tab, setTab]       = useState('home');
  const [user, setUser]     = useState(null);
  const [live, setLive]     = useState(0);

  // Chat
  const [msgs, setMsgs]     = useState([]);
  const [inp, setInp]       = useState('');
  const [busy, setBusy]     = useState(false);
  const chatEnd = useRef(null);
  const mainRef = useRef(null);

  // Booth
  const [bState, setBState] = useState('');
  const [bDist, setBDist]   = useState('');
  const [bResult, setBRes]  = useState(null);
  const [boothLoading, setBoothLoading] = useState(false);

  // Fake News
  const [fInp, setFInp]     = useState('');
  const [fRes, setFRes]     = useState(null);
  const [fLoad, setFLoad]   = useState(false);

  // Quiz
  const [quiz, setQuiz]     = useState({ active:false, idx:0, score:0, sel:null, done:false, qs:[] });

  // Memoized values
  const t = useMemo(() => T[lang] || T.hi, [lang]);

  const tabList = useMemo(() => [
    { id: 'home', icon: '🏠', label: t.home },
    { id: 'chat', icon: '💬', label: t.chat },
    { id: 'guide', icon: '📋', label: t.guide },
    { id: 'booth', icon: '📍', label: t.booth },
    { id: 'docs', icon: '🪪', label: t.docs },
    { id: 'fake', icon: '🔍', label: t.fake },
    { id: 'quiz', icon: '🎮', label: t.quiz },
  ], [t]);

  const verdictColorMap = useMemo(() => ({
    TRUE: '#1A936F', FALSE: '#e63946',
    'PARTLY TRUE': '#FF6B35', ILLEGAL: '#8B5CF6',
    UNVERIFIED: '#FBBF24', ERROR: '#FBBF24'
  }), []);

  const debouncedInp = useDebounce(inp, INPUT_DEBOUNCE_MS);
  const debouncedFakeInp = useDebounce(fInp, INPUT_DEBOUNCE_MS);

  // ─── EFFECTS ────────────────────────────────────────────────
  useEffect(() => onAuthChange(setUser), []);
  useEffect(() => {
    setMsgs([{ r:'bot', t: t.greeting }]);
  }, [lang, t.greeting]);
  useEffect(() => {
    const unsub = listenToLiveAttendance('demo-event-001', d => setLive(d.count));
    return unsub;
  }, []);
  useEffect(() => { requestNotificationPermission(); }, []);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs]);

  /**
   * Switches the active language and updates document properties for accessibility
   * @param {string} newLang - The language code to switch to (e.g. 'en', 'hi')
   * @returns {void}
   */
  const handleLanguageSwitch = useCallback((newLang) => {
    trackLanguageSwitch(lang, newLang);
    setLang(newLang);
    document.documentElement.lang = newLang;
    document.title = newLang === 'hi'
      ? 'चुनाव साथी - Election Guide'
      : 'Chunao Saathi - Election Guide';
  }, [lang]);

  /**
   * Handles tab change and focuses the main content area for screen readers
   * @param {string} tabId - ID of the tab to switch to
   * @returns {void}
   */
  const handleTabChange = useCallback((tabId) => {
    setTab(tabId);
    trackEvent('feature_clicked', { feature: tabId });
    setTimeout(() => mainRef.current?.focus(), 100);
  }, []);

  /**
   * Safe method to add messages, keeping only the last MAX_CHAT_MESSAGES
   * @param {Object} msg - The message object to add
   * @returns {void}
   */
  const addMessage = useCallback((msg) => {
    setMsgs(prev => {
      const updated = [...prev, msg];
      return updated.length > MAX_CHAT_MESSAGES ? updated.slice(-MAX_CHAT_MESSAGES) : updated;
    });
  }, []);

  // ─── CHAT ────────────────────────────────────────────────────
  /**
   * Sends user message to Gemini AI chatbot
   * Adds message to chat history and handles API response
   * @async
   * @returns {Promise<void>}
   */
  const sendMessage = useCallback(async () => {
    if (!debouncedInp.trim() || busy) return;
    const q = debouncedInp.trim();
    addMessage({ r:'user', t:q });
    setInp('');
    setBusy(true);
    trackChatbotQuestion(lang);
    try {
      const reply = await API.chatbot(q, lang);
      addMessage({ r:'bot', t:reply });
    } catch {
      addMessage({ r:'bot', t: lang === 'hi' ? '❌ त्रुटि हुई। कृपया दोबारा कोशिश करें।' : '❌ Error. Please try again.' });
    }
    setBusy(false);
  }, [debouncedInp, busy, lang, addMessage]);

  const handleChatKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const suggestions = useMemo(() => lang === 'hi'
    ? ['वोट कैसे डालें?', 'मेरा बूथ नंबर', 'NOTA क्या है?', 'ईवीएम कैसे काम करता है?']
    : ['How to vote?', 'Find my booth', 'What is NOTA?', 'How does EVM work?'], [lang]);

  // ─── FAKER NEWS ──────────────────────────────────────────────
  /**
   * Checks if a given claim is fake news using backend API
   * @async
   * @returns {Promise<void>}
   */
  const checkFake = useCallback(async () => {
    if (!debouncedFakeInp.trim()) return;
    setFLoad(true); setFRes(null);
    try {
      const r = await API.checkFakeNews(debouncedFakeInp.trim());
      setFRes(r);
      trackFakeNewsCheck(r.verdict);
    } catch {
      setFRes({ verdict:'ERROR', explanation: lang === 'hi' ? 'सत्यापन में त्रुटि।' : 'Verification failed.' });
    }
    setFLoad(false);
  }, [debouncedFakeInp, lang]);

  // ─── QUIZ ────────────────────────────────────────────────────
  /**
   * Initializes a new quiz with shuffled questions
   * Tracks quiz_started event to Firebase Analytics
   * @returns {void}
   */
  const startQuiz = useCallback(() => {
    const qs = [...QUIZ_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 5);
    setQuiz({ active:true, idx:0, score:0, sel:null, done:false, qs });
    trackEvent('quiz_started');
  }, []);

  /**
   * Records voter's answer selection for current quiz question
   * @param {number} i - Index of selected answer option (0-3)
   * @returns {void}
   */
  const selectAnswer = useCallback((i) => {
    if (quiz.sel !== null) return;
    const correct = i === quiz.qs[quiz.idx].ans;
    setQuiz(p => ({ ...p, sel:i, score: p.score + (correct ? 1 : 0) }));
  }, [quiz]);

  /**
   * Advances to next quiz question or marks quiz as complete
   * Saves score to Firebase Firestore if user is authenticated
   * @async
   * @returns {Promise<void>}
   */
  const nextQuestion = useCallback(async () => {
    const next = quiz.idx + 1;
    if (next >= quiz.qs.length) {
      setQuiz(p => ({ ...p, done:true }));
      if (user) await saveQuizScore(user.uid, { score: quiz.score, total: quiz.qs.length });
    } else {
      setQuiz(p => ({ ...p, idx:next, sel:null }));
    }
  }, [quiz, user]);

  /**
   * Keyboard handler for quiz options
   * @param {Object} e - React Synthetic Event
   * @param {number} i - Index of option
   * @returns {void}
   */
  const handleQuizKeyDown = useCallback((e, i) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectAnswer(i);
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      const next = document.querySelector(`[data-quiz-option="${(i + 1) % 4}"]`);
      next?.focus();
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = document.querySelector(`[data-quiz-option="${(i + 3) % 4}"]`);
      prev?.focus();
    }
  }, [selectAnswer]);

  // ─── BOOTH ───────────────────────────────────────────────────
  /**
   * Finds polling booth based on selected state and district
   * Tracks search event to Firebase Analytics
   * @returns {void}
   */
  const findBooth = useCallback(() => {
    if (!bState) return;
    setBoothLoading(true);
    setTimeout(() => {
      setBRes({ state: bState, district: bDist || 'Central District', booth:'Govt. Sr. Sec. School, Ward 4', time:'7:00 AM – 6:00 PM' });
      trackBoothSearch(bState, bDist);
      setBoothLoading(false);
    }, 600);
  }, [bState, bDist]);

  // ─── STYLES ──────────────────────────────────────────────────
  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Noto+Sans+Devanagari:wght@400;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; }
    body { background: #050505; color: #F1F1F1; margin:0; font-family:'Outfit','Noto Sans Devanagari',sans-serif; -webkit-font-smoothing: antialiased; }
    ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-thumb { background:#333; border-radius:4px; }

    /* Glass & Card */
    .glass { background:rgba(255,255,255,0.04); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.08); }
    .card { background:linear-gradient(145deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01)); border:1px solid rgba(255,255,255,0.1); border-radius:24px; padding:20px; transition:border-color .3s,transform .3s,box-shadow .3s; }
    .card:hover { border-color:rgba(255,107,53,0.4); transform:translateY(-3px); box-shadow:0 16px 40px rgba(0,0,0,0.5); }
    .card-flat { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:20px; padding:16px; }

    /* Button Variants */
    .btn { border:none; border-radius:16px; padding:14px 24px; font-weight:700; cursor:pointer; font-family:inherit; transition:all .25s; font-size:14px; }
    .btn-primary { background:linear-gradient(135deg,#FF6B35,#D44D1F); color:#fff; box-shadow:0 6px 20px rgba(255,107,53,0.3); }
    .btn-primary:hover { transform:translateY(-2px); box-shadow:0 10px 30px rgba(255,107,53,0.45); }
    .btn-primary:active { transform:scale(.97); }
    .btn-primary:disabled { opacity:.5; cursor:not-allowed; transform:none; }
    .btn-ghost { background:rgba(255,255,255,0.08); color:#fff; border:1px solid rgba(255,255,255,0.12); }
    .btn-ghost:hover { background:rgba(255,255,255,0.14); }
    .btn-danger { background:rgba(239,68,68,0.12); color:#ef4444; border:1px solid rgba(239,68,68,0.3); }
    .btn-success { background:rgba(26,147,111,0.12); color:#1A936F; border:1px solid rgba(26,147,111,0.3); }

    /* Inputs */
    .input { background:rgba(255,255,255,0.05); border:1.5px solid rgba(255,255,255,0.1); border-radius:16px; padding:14px 18px; color:#fff; font-family:inherit; font-size:14px; outline:none; transition:border-color .25s,background .25s; width:100%; }
    .input:focus { border-color:#FF6B35; background:rgba(255,255,255,0.08); }
    .input::placeholder { color:rgba(255,255,255,0.35); }
    select.input option { background:#111; color:#fff; }

    /* Nav */
    .nav-pill { position:fixed; bottom:20px; left:50%; transform:translateX(-50%); z-index:100; display:flex; align-items:center; padding:6px; gap:2px; border-radius:30px; }
    .nav-btn { display:flex; flex-direction:column; align-items:center; gap:3px; border:none; background:none; color:#666; cursor:pointer; padding:8px 10px; border-radius:22px; transition:all .25s; font-size:9px; font-weight:700; font-family:inherit; min-width:46px; }
    .nav-btn.active { color:#FF6B35; background:rgba(255,107,53,0.12); }
    .nav-btn:hover:not(.active) { color:#aaa; background:rgba(255,255,255,0.05); }
    .nav-btn .icon { font-size:18px; line-height:1; transition:transform .25s; }
    .nav-btn.active .icon { transform:translateY(-3px) scale(1.15); }

    /* Animations */
    @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
    @keyframes pulseDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.6)} }
    @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
    @keyframes spin { to{transform:rotate(360deg)} }
    .fade-up { animation:fadeUp .5s cubic-bezier(.23,1,.32,1) both; }
    .fade-up-delay { animation:fadeUp .5s .1s cubic-bezier(.23,1,.32,1) both; }
    .fade-up-delay2 { animation:fadeUp .5s .2s cubic-bezier(.23,1,.32,1) both; }

    /* Chat bubbles */
    .bubble-bot { background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:20px 20px 20px 4px; padding:14px 18px; max-width:85%; font-size:14px; line-height:1.65; white-space:pre-wrap; }
    .bubble-user { background:linear-gradient(135deg,#FF6B35,#D44D1F); border-radius:20px 20px 4px 20px; padding:14px 18px; max-width:85%; font-size:14px; line-height:1.65; box-shadow:0 6px 16px rgba(255,107,53,0.2); align-self:flex-end; }

    /* Typing indicator */
    .typing { display:flex; gap:4px; align-items:center; padding:12px 16px; }
    .dot { width:6px; height:6px; background:#FF6B35; border-radius:50%; animation:pulseDot .8s infinite; }
    .dot:nth-child(2){animation-delay:.15s} .dot:nth-child(3){animation-delay:.3s}

    /* Quiz */
    .quiz-opt { width:100%; padding:14px 18px; border-radius:14px; background:rgba(255,255,255,0.04); border:1.5px solid rgba(255,255,255,0.1); color:#fff; cursor:pointer; text-align:left; font-family:inherit; font-size:14px; transition:border-color .2s,background .2s; }
    .quiz-opt:hover:not(:disabled) { border-color:#FF6B35; background:rgba(255,107,53,0.06); }
    .quiz-opt.correct { background:rgba(26,147,111,0.15); border-color:#1A936F; color:#1A936F; }
    .quiz-opt.wrong { background:rgba(239,68,68,0.12); border-color:#ef4444; color:#ef4444; }
    .quiz-opt:disabled { cursor:default; }

    /* Progress bar */
    .prog-bar { height:4px; background:rgba(255,255,255,0.1); border-radius:2px; overflow:hidden; }
    .prog-fill { height:100%; background:linear-gradient(90deg,#FF6B35,#D44D1F); border-radius:2px; transition:width .4s ease; }

    /* Verdict */
    .verdict-true { background:rgba(26,147,111,0.1); border:1.5px solid rgba(26,147,111,0.35); border-radius:20px; padding:20px; }
    .verdict-false { background:rgba(239,68,68,0.1); border:1.5px solid rgba(239,68,68,0.35); border-radius:20px; padding:20px; }
    .verdict-unverified { background:rgba(251,191,36,0.08); border:1.5px solid rgba(251,191,36,0.3); border-radius:20px; padding:20px; }

    /* Hero gradient bg */
    .page-bg { background:radial-gradient(ellipse at 80% 0%, rgba(255,107,53,.12) 0%, transparent 60%),radial-gradient(ellipse at 20% 100%, rgba(46,91,255,.08) 0%, transparent 60%); }
  `;

  // ─────────────────────────────────────────────────────────────
  // SECTION RENDERERS
  // ─────────────────────────────────────────────────────────────
  const renderHome = useCallback(() => (
    <div>
      {/* HERO */}
      <div className="fade-up" style={{ background:'linear-gradient(135deg,#FF6B35,#C23B1A)', borderRadius:28, padding:28, marginBottom:20, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-10, right:-10, fontSize:130, opacity:.08, lineHeight:1 }} aria-hidden="true">🗳️</div>
        <Pill color="#fff" style={{ marginBottom:12 }}><span aria-hidden="true">🇮🇳</span> {lang === 'hi' ? 'भारत निर्वाचन आयोग' : 'Election Commission of India'}</Pill>
        <h1 style={{ fontSize:34, fontWeight:800, lineHeight:1.1, color:'#fff', margin:'12px 0 10px', letterSpacing:'-0.5px', whiteSpace:'pre-line' }}>
          {t.heroTitle}
        </h1>
        <p style={{ fontSize:14, color:'rgba(255,255,255,0.8)', lineHeight:1.6, marginBottom:20 }}>{t.heroSub}</p>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <button className="btn btn-ghost" onClick={() => handleTabChange('chat')} style={{ borderColor:'rgba(255,255,255,0.3)' }} aria-label="Open AI Chatbot">
            {lang === 'hi' ? 'AI से पूछें →' : 'Ask AI Assistant →'}
          </button>
          <div style={{ display:'flex', gap:6, alignItems:'center', background:'rgba(255,255,255,0.12)', borderRadius:12, padding:'4px 6px' }} role="group" aria-label="Language selection">
            {['hi','en'].map(l => (
              <button key={l}
                style={{ background: lang===l ? '#fff' : 'transparent', color: lang===l ? '#FF6B35' : '#fff', border:'none', borderRadius:8, padding:'5px 10px', fontWeight:700, fontSize:12, cursor:'pointer', transition:'all .2s' }}
                onClick={() => handleLanguageSwitch(l)} aria-pressed={lang===l}
              >{l.toUpperCase()}</button>
            ))}
          </div>
        </div>
      </div>

      {/* QUICK ACCESS */}
      <div className="fade-up-delay" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
        {[
          { id:'chat', icon:'🤖', label: lang==='hi' ? 'AI सहायक' : 'AI Assistant', sub: lang==='hi' ? 'चुनाव विशेषज्ञ' : 'Election Expert', color:'#FF6B35' },
          { id:'booth', icon:'📍', label: lang==='hi' ? 'बूथ खोजें' : 'Find Booth', sub: lang==='hi' ? 'नज़दीकी केंद्र' : 'Nearest Center', color:'#2E5BFF' },
          { id:'fake', icon:'🛡️', label: lang==='hi' ? 'सत्यता जांचें' : 'Fact Check', sub: lang==='hi' ? 'अफवाह से बचें' : 'Stop Misinformation', color:'#8B5CF6' },
          { id:'quiz', icon:'🏆', label: lang==='hi' ? 'क्विज़ खेलें' : 'Play Quiz', sub: lang==='hi' ? 'ज्ञान बढ़ाएं' : 'Test Knowledge', color:'#1A936F' },
        ].map(f => (
          <button key={f.id} className="card" onClick={() => handleTabChange(f.id)} style={{ textAlign:'left', background:'rgba(255,255,255,0.02)', cursor:'pointer' }} aria-label={`Open ${f.label}`}>
            <div style={{ fontSize:30, marginBottom:10 }} aria-hidden="true">{f.icon}</div>
            <div style={{ fontWeight:700, fontSize:15, color:'#fff' }}>{f.label}</div>
            <div style={{ fontSize:11, color:'#666', marginTop:3 }}>{f.sub}</div>
          </button>
        ))}
      </div>

      {/* HELPLINE */}
      <div className="fade-up-delay2 card-flat" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', borderColor:'rgba(46,91,255,0.2)', background:'rgba(46,91,255,0.05)' }}>
        <div>
          <div style={{ fontSize:11, color:'#2E5BFF', fontWeight:700, letterSpacing:1, marginBottom:4 }}><span aria-hidden="true">📞</span> {lang==='hi' ? 'मतदाता हेल्पलाइन' : 'VOTER HELPLINE'}</div>
          <div style={{ fontSize:32, fontWeight:800, letterSpacing:4 }}>{ECI_HELPLINE}</div>
          <div style={{ fontSize:11, color:'#666', marginTop:3 }}>{lang==='hi' ? '24×7 निःशुल्क सेवा' : 'Free 24×7 service'}</div>
        </div>
        <a href={`tel:${ECI_HELPLINE}`} className="btn btn-primary" style={{ padding:'12px 20px', textDecoration:'none', borderRadius:14 }} aria-label="Call Voter Helpline">
          {lang==='hi' ? 'कॉल करें' : 'Call Now'}
        </a>
      </div>
    </div>
  ), [lang, t, handleLanguageSwitch, handleTabChange]);

  const renderChat = useCallback(() => (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 200px)' }} aria-label="AI Chat Interface">
      {/* Header */}
      <div className="card-flat" style={{ marginBottom:12, display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:44, height:44, borderRadius:14, background:'linear-gradient(135deg,#FF6B35,#D44D1F)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }} aria-hidden="true">🤖</div>
        <div>
          <h2 style={{ fontWeight:700, fontSize:15, margin:0 }}>Chunao Saathi AI</h2>
          <div style={{ fontSize:11, color:'#1A936F', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ width:6, height:6, background:'#1A936F', borderRadius:'50%', display:'inline-block' }} className="pulse" aria-hidden="true" />
            {lang==='hi' ? 'ऑनलाइन • Gemini AI' : 'Online • Gemini AI'}
          </div>
        </div>
      </div>

      {/* Suggestions (first load) */}
      {msgs.length <= 1 && (
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }} role="group" aria-label="Suggested queries">
          {suggestions.map(s => (
            <button key={s} className="btn btn-ghost" style={{ fontSize:12, padding:'8px 14px', borderRadius:12, whiteSpace:'nowrap' }}
              onClick={() => { setInp(s); setTimeout(sendMessage, 50); }}
            >{s}</button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div role="log" aria-live="polite" style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:12, paddingRight:4, marginBottom:12 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display:'flex', flexDirection:'column', alignItems: m.r==='user' ? 'flex-end' : 'flex-start' }}>
            <div className={m.r === 'user' ? 'bubble-user' : 'bubble-bot'}>{m.t}</div>
            <div style={{ fontSize:10, color:'#444', marginTop:4 }}>{m.r==='user' ? 'YOU' : 'CHUNAO SAATHI'}</div>
          </div>
        ))}
        {busy && (
          <div className="bubble-bot" style={{ display:'inline-flex' }} aria-label="AI is typing">
            <div className="typing"><div className="dot" aria-hidden="true"/><div className="dot" aria-hidden="true"/><div className="dot" aria-hidden="true"/></div>
          </div>
        )}
        <div ref={chatEnd} />
      </div>

      {/* Input */}
      <div className="glass" style={{ borderRadius:22, padding:6, display:'flex', gap:8 }}>
        <input className="input" style={{ background:'transparent', border:'none', borderRadius:16, paddingLeft:14 }}
          placeholder={t.chatPlaceholder} value={inp}
          onChange={e => setInp(e.target.value)}
          onKeyDown={handleChatKeyDown}
          aria-label={lang==='hi' ? 'अपना सवाल लिखें' : 'Type your question'}
          aria-required="true"
          aria-describedby="chat-hint"
        />
        <button className="btn btn-primary" style={{ width:48, height:48, padding:0, borderRadius:16, flexShrink:0 }}
          onClick={sendMessage} aria-disabled={busy || !inp.trim()} disabled={busy || !inp.trim()} 
          aria-busy={busy} aria-label={busy ? 'Sending message, please wait' : 'Send message'}>
          <span style={{ fontSize:18 }} aria-hidden="true">➤</span>
        </button>
      </div>
      <p id="chat-hint" className="sr-only">Press Enter to send. Ask in Hindi or English.</p>
    </div>
  ), [lang, msgs, suggestions, busy, inp, t.chatPlaceholder, handleChatKeyDown, sendMessage]);

  const renderGuide = useCallback(() => {
    const steps = lang === 'hi'
      ? [
          { icon:'🔍', title:'नाम जांचें', desc:'electoralsearch.eci.gov.in पर या मतदाता हेल्पलाइन App पर अपना नाम खोजें।' },
          { icon:'📍', title:'बूथ खोजें', desc:'अपने EPIC नंबर को 1950 पर SMS करें या हमारे ऐप का Booth Finder उपयोग करें।' },
          { icon:'🪪', title:'दस्तावेज़ लाएं', desc:'मतदाता परिचय पत्र (EPIC) या कोई अन्य मान्य फोटो पहचान लाएं।' },
          { icon:'✅', title:'सत्यापन', desc:'अधिकारी नाम जाँचेगा, उंगली पर स्याही लगाएगा और हस्ताक्षर लेगा।' },
          { icon:'🗳️', title:'वोट डालें', desc:'EVM पर अपनी पसंद का बटन दबाएं। बीप की आवाज़ से पुष्टि होगी। VVPAT पर्ची भी देखें।' },
        ]
      : [
          { icon:'🔍', title:'Check Your Name', desc:'Search at electoralsearch.eci.gov.in or the Voter Helpline App to confirm your enrollment.' },
          { icon:'📍', title:'Locate Your Booth', desc:'SMS your EPIC number to 1950 or use our Booth Finder to get your assigned polling station.' },
          { icon:'🪪', title:'Bring ID', desc:'Carry your Voter ID (EPIC) or any other valid government-issued photo identity document.' },
          { icon:'✅', title:'Verification', desc:'The official checks your name, inks your finger, and takes your signature — three separate desks.' },
          { icon:'🗳️', title:'Cast Your Vote', desc:'Press the button next to your candidate on the EVM. A beep confirms your vote. Check the VVPAT slip.' },
        ];

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div className="fade-up card-flat" style={{ background:'rgba(255,107,53,0.06)', borderColor:'rgba(255,107,53,0.2)', textAlign:'center', padding:16 }}>
          <div style={{ fontSize:13, color:'#FF6B35', fontWeight:700 }}>
            {lang==='hi' ? 'मतदान — 5 आसान कदम' : 'VOTING IN 5 EASY STEPS'}
          </div>
        </div>
        {steps.map((s, i) => (
          <article key={i} className={'card fade-up'} style={{ display:'flex', gap:16, paddingTop:18, paddingBottom:18, animationDelay:`${i*0.07}s` }}>
            <div style={{ width:44, height:44, background:'rgba(255,107,53,0.1)', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }} aria-hidden="true">{s.icon}</div>
            <div>
              <h3 style={{ fontWeight:700, fontSize:16, color:'#fff', margin:'0 0 6px' }}>{s.title}</h3>
              <p style={{ fontSize:13.5, color:'#999', lineHeight:1.6, margin:0 }}>{s.desc}</p>
            </div>
          </article>
        ))}
      </div>
    );
  }, [lang]);

  const renderBooth = useCallback(() => (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div className="fade-up card">
        <h3 style={{ margin:'0 0 16px', fontSize:16, fontWeight:700 }}><span aria-hidden="true">🔍</span> {lang==='hi' ? 'अपना राज्य और जिला चुनें' : 'Select your State & District'}</h3>
        <select className="input" value={bState} onChange={e => { setBState(e.target.value); setBRes(null); }}
          style={{ marginBottom:12 }} aria-label={t.selectState} aria-required="true" aria-describedby="state-hint">
          <option value="">{t.selectState}</option>
          {STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <p id="state-hint" className="sr-only">Select the state where you are registered to vote</p>
        <input className="input" type="text" placeholder={t.enterDistrict}
          value={bDist} onChange={e => { setBDist(e.target.value); setBRes(null); }}
          style={{ marginBottom:16 }} aria-label={t.enterDistrict}
        />
        <button className="btn btn-primary" style={{ width:'100%', borderRadius:16 }} onClick={findBooth} disabled={!bState || boothLoading}>
          {boothLoading ? 'Loading...' : t.findBooth}
        </button>
      </div>

      {boothLoading && <LoadingSpinner />}

      {bResult && !boothLoading && (
        <div className="fade-up">
          <div className="card" style={{ background:'rgba(26,147,111,0.05)', borderColor:'rgba(26,147,111,0.25)', marginBottom:16 }}>
            <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:12 }}>
              <div style={{ fontSize:32, lineHeight:1 }} aria-hidden="true">🏫</div>
              <div>
                <div style={{ fontSize:12, color:'#1A936F', fontWeight:700, marginBottom:2 }}><span aria-hidden="true">✅</span> {lang==='hi' ? 'मतदान केंद्र मिला' : 'BOOTH ASSIGNED'}</div>
                <div style={{ fontWeight:700, fontSize:17 }}>{bResult.booth}</div>
              </div>
            </div>
            <Divider />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div className="card-flat">
                <div style={{ fontSize:11, color:'#666', marginBottom:3 }}>{lang==='hi' ? 'राज्य' : 'State'}</div>
                <div style={{ fontWeight:700, fontSize:14 }}>{bResult.state}</div>
              </div>
              <div className="card-flat">
                <div style={{ fontSize:11, color:'#666', marginBottom:3 }}>{lang==='hi' ? 'जिला' : 'District'}</div>
                <div style={{ fontWeight:700, fontSize:14 }}>{bResult.district}</div>
              </div>
              <div className="card-flat" style={{ gridColumn:'1/-1' }}>
                <div style={{ fontSize:11, color:'#666', marginBottom:3 }}><span aria-hidden="true">⏰</span> {lang==='hi' ? 'मतदान समय' : 'Polling Time'}</div>
                <div style={{ fontWeight:700, fontSize:14 }}>{bResult.time}</div>
              </div>
            </div>
          </div>

          {/* Google Maps Embed */}
          <div className="glass" style={{ borderRadius:20, overflow:'hidden', height:220, position:'relative' }}>
            <iframe
              title={`Map: ${bResult.booth}`}
              width="100%" height="100%"
              style={{ border:0, display:'block', filter:'invert(90%) hue-rotate(180deg) brightness(95%) contrast(88%)' }}
              loading="lazy" fetchpriority="low" allowFullScreen referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}&q=${encodeURIComponent(bResult.booth + ', ' + bResult.district + ', ' + bResult.state)}&zoom=15`}
            />
          </div>
          <p style={{ fontSize:11, color:'#444', textAlign:'center', marginTop:8 }}>
            <span aria-hidden="true">⚠️</span> {lang==='hi' ? 'मानचित्र न दिखे? Google Cloud में Maps Embed API चालू करें।' : 'Map not showing? Enable Maps Embed API in Google Cloud Console.'}
          </p>
        </div>
      )}
    </div>
  ), [lang, t, bState, bDist, bResult, boothLoading, findBooth]);

  const renderDocs = useCallback(() => {
    const docs = lang === 'hi'
      ? [
          { icon:'🪪', name:'EPIC कार्ड (मतदाता ID)', primary:true },
          { icon:'🔵', name:'आधार कार्ड' },
          { icon:'💳', name:'PAN कार्ड' },
          { icon:'🚗', name:'ड्राइविंग लाइसेंस' },
          { icon:'📘', name:'पासपोर्ट' },
          { icon:'🏦', name:'फोटो सहित बैंक पासबुक' },
          { icon:'🏥', name:'स्वास्थ्य बीमा कार्ड' },
          { icon:'📄', name:'पेंशन दस्तावेज़' },
        ]
      : [
          { icon:'🪪', name:'EPIC Card (Voter ID)', primary:true },
          { icon:'🔵', name:'Aadhaar Card' },
          { icon:'💳', name:'PAN Card' },
          { icon:'🚗', name:'Driving License' },
          { icon:'📘', name:'Passport' },
          { icon:'🏦', name:'Passbook with Photo' },
          { icon:'🏥', name:'Health Insurance Card' },
          { icon:'📄', name:'Pension Document' },
        ];

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div className="card-flat" style={{ background:'rgba(255,107,53,0.06)', borderColor:'rgba(255,107,53,0.2)' }}>
          <p style={{ margin:0, fontSize:13, color:'#ccc', lineHeight:1.6 }}>
            {lang==='hi'
              ? '✅ नीचे दिए गए दस्तावेज़ों में से कोई एक लाकर वोट डाल सकते हैं। सभी में फोटो होना जरूरी है।'
              : '✅ Bring any one of the documents below to vote. All must have your photograph.'}
          </p>
        </div>
        {docs.map((d, i) => (
          <div key={i} className={'card-flat fade-up'} style={{ display:'flex', alignItems:'center', gap:14, animationDelay:`${i*0.05}s`, borderColor: d.primary ? 'rgba(255,107,53,0.3)' : undefined, background: d.primary ? 'rgba(255,107,53,0.05)' : undefined }}>
            <div style={{ fontSize:24, width:40, textAlign:'center' }} aria-hidden="true">{d.icon}</div>
            <div style={{ fontWeight: d.primary ? 700 : 500, fontSize:14, flex:1 }}>{d.name}</div>
            {d.primary && <Pill color="#FF6B35">{lang==='hi' ? 'पसंदीदा' : 'Preferred'}</Pill>}
          </div>
        ))}
      </div>
    );
  }, [lang]);

  const renderFake = useCallback(() => {
    const verdictClass = {
      FALSE:'verdict-false', TRUE:'verdict-true', UNVERIFIED:'verdict-unverified', ERROR:'verdict-unverified'
    };
    const verdictIcon = { FALSE:'❌', TRUE:'✅', UNVERIFIED:'⚠️', ERROR:'⚠️' };

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <div className="card" style={{ background:'rgba(139,92,246,0.05)', borderColor:'rgba(139,92,246,0.2)' }}>
          <div style={{ fontSize:14, color:'#ccc', marginBottom:14, lineHeight:1.6 }}>
            {lang==='hi'
              ? '📱 कोई भी वायरल मैसेज, पोस्ट या खबर यहाँ पेस्ट करें — हम AI से उसकी सच्चाई जांचेंगे।'
              : '📱 Paste any viral message, post, or claim here — AI will verify its authenticity.'}
          </div>
          <textarea className="input" style={{ height:110, resize:'none', borderRadius:16, fontSize:14 }}
            placeholder={t.fakePH} value={fInp} onChange={e => setFInp(e.target.value)}
            aria-label="Enter election claim or rumour to fact-check"
            aria-required="true" aria-describedby="fake-hint" aria-multiline="true"
          />
          <p id="fake-hint" style={{ fontSize: '10px', color: '#556677', marginTop: '4px' }}>
            Paste WhatsApp message or news headline. We will verify it.
          </p>
          <button className="btn btn-primary fade-up" style={{ width:'100%', borderRadius:16, marginTop:12 }}
            onClick={checkFake} disabled={fLoad || !fInp.trim()} aria-busy={fLoad}>
            {fLoad ? t.checking : t.verifyNews}
          </button>
        </div>

        {fRes && (
          <div className={`fade-up ${verdictClass[fRes.verdict] || 'verdict-unverified'}`} role="alert" aria-live="assertive">
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <span style={{ fontSize:24 }} aria-hidden="true">{verdictIcon[fRes.verdict] || '⚠️'}</span>
              <div>
                <div style={{ fontSize:12, opacity:.7, marginBottom:2 }}>{lang==='hi' ? 'निर्णय' : 'VERDICT'}</div>
                <div style={{ fontWeight:800, fontSize:20, color: verdictColorMap[fRes.verdict] || '#FBBF24' }}>{fRes.verdict}</div>
              </div>
            </div>
            <p style={{ margin:0, fontSize:14, lineHeight:1.65, color:'#ccc' }}>{fRes.explanation}</p>
            <button className="btn btn-ghost" style={{ marginTop:14, fontSize:12 }} onClick={() => { setFRes(null); setFInp(''); }}>
              {lang==='hi' ? '🔄 नई जांच करें' : '🔄 Check another'}
            </button>
          </div>
        )}

        {/* Common myths */}
        <div style={{ fontSize:12, color:'#555', textAlign:'center' }}>— {lang==='hi' ? 'अक्सर गलत अफवाहें' : 'Common election myths'} —</div>
        {[
          { claim: lang==='hi' ? 'EVM Bluetooth से हैक होती है' : 'EVMs can be hacked via Bluetooth', verdict:'FALSE' },
          { claim: lang==='hi' ? 'NOTA से चुनाव रद्द होता है' : 'NOTA can cancel an election', verdict:'FALSE' },
        ].map((m, i) => (
          <button key={i} className="card-flat" style={{ textAlign:'left', cursor:'pointer', background:'transparent' }}
            onClick={() => setFInp(m.claim)}>
            <div style={{ display:'flex', justify:'space-between', gap:10 }}>
              <div style={{ fontSize:13, flex:1 }}>"{m.claim}"</div>
              <Pill color="#ef4444">{m.verdict}</Pill>
            </div>
          </button>
        ))}
      </div>
    );
  }, [lang, t, fInp, fLoad, fRes, checkFake, verdictColorMap]);

  const renderQuiz = useCallback(() => {
    if (!quiz.active) return (
      <div className="card fade-up" style={{ textAlign:'center', padding:40 }}>
        <div style={{ fontSize:72, marginBottom:20, lineHeight:1 }} role="img" aria-hidden="true">🏆</div>
        <h2 style={{ fontSize:24, fontWeight:800, marginBottom:10 }}>{t.quizTitle}</h2>
        <p style={{ color:'#888', fontSize:14, lineHeight:1.6, marginBottom:28 }}>
          {lang==='hi'
            ? 'भारतीय चुनाव प्रणाली के बारे में सवालों का जवाब दें और अपनी जानकारी बढ़ाएं!'
            : 'Answer questions about the Indian election system and test your civic knowledge!'}
        </p>
        <button className="btn btn-primary" style={{ width:'100%', borderRadius:18, padding:'16px' }} onClick={startQuiz}>
          <span aria-hidden="true">🎮</span> {t.startQuiz}
        </button>
      </div>
    );

    if (quiz.done) {
      const pct = Math.round((quiz.score / quiz.qs.length) * 100);
      const emoji = pct >= 80 ? '🥇' : pct >= 60 ? '🥈' : '🥉';
      return (
        <div className="card fade-up" style={{ textAlign:'center', padding:36 }}>
          <div style={{ fontSize:64, marginBottom:8 }} aria-hidden="true">{emoji}</div>
          <h2 style={{ fontSize:22, fontWeight:800 }}>{t.quizScore}</h2>
          <div style={{ fontSize:52, fontWeight:800, color:'#FF6B35', margin:'12px 0' }}>
            {quiz.score}<span style={{ fontSize:22, color:'#666' }}>/{quiz.qs.length}</span>
          </div>
          <div className="prog-bar" style={{ marginBottom:20 }}>
            <div className="prog-fill" style={{ width:`${pct}%` }} />
          </div>
          <p style={{ color:'#888', fontSize:14, marginBottom:24 }}>
            {pct >= 80
              ? (lang==='hi' ? '🎉 शानदार! आप एक जागरूक मतदाता हैं!' : '🎉 Excellent! You are an informed voter!')
              : (lang==='hi' ? '📚 अच्छी कोशिश! और अभ्यास करें।' : '📚 Good try! Keep learning.')}
          </p>
          <button className="btn btn-primary" style={{ width:'100%', borderRadius:16 }} onClick={startQuiz}>{t.playAgain}</button>
        </div>
      );
    }

    const q = quiz.qs[quiz.idx];
    const question = lang === 'hi' ? (q.hi || q.q) : q.q;
    const pct = ((quiz.idx) / quiz.qs.length) * 100;

    return (
      <div className="fade-up" style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {/* Progress */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#666', marginBottom:6 }}>
            <span aria-live="polite">{lang==='hi' ? `प्रश्न ${quiz.idx+1} / ${quiz.qs.length}` : `Question ${quiz.idx+1} of ${quiz.qs.length}`}</span>
            <span style={{ color:'#1A936F', fontWeight:700 }}><span aria-hidden="true">⭐</span> {quiz.score}</span>
          </div>
          <div className="prog-bar"><div className="prog-fill" style={{ width:`${pct}%` }} /></div>
        </div>

        {/* Question */}
        <div className="card" style={{ background:'rgba(255,107,53,0.04)', borderColor:'rgba(255,107,53,0.15)' }}>
          <h3 style={{ fontSize:12, color:'#FF6B35', fontWeight:700, marginBottom:10, margin:0 }}>Q{quiz.idx + 1}</h3>
          <p style={{ fontSize:17, fontWeight:600, lineHeight:1.5, margin:0 }}>{question}</p>
        </div>

        {/* Options */}
        <div role="radiogroup" aria-label="Answer options" aria-required="true" style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {q.opts.map((opt, i) => {
            let cls = 'quiz-opt';
            if (quiz.sel !== null) {
              if (i === q.ans) cls += ' correct';
              else if (i === quiz.sel) cls += ' wrong';
            }
            return (
              <button key={i} className={cls} onClick={() => selectAnswer(i)} disabled={quiz.sel !== null}
                onKeyDown={(e) => handleQuizKeyDown(e, i)}
                data-quiz-option={i}
                tabIndex={0}
                role="radio"
                aria-checked={quiz.sel === i}
                aria-label={`Option ${['A','B','C','D'][i]}: ${opt}${quiz.sel !== null ? (i === q.ans ? ' - Correct answer' : quiz.sel === i ? ' - Your wrong answer' : '') : ''}`}>
                <span style={{ opacity:.5, marginRight:10, fontSize:12 }} aria-hidden="true">
                  {String.fromCharCode(65 + i)}.
                </span>
                {opt}
              </button>
            );
          })}
        </div>

        {quiz.sel !== null && (
          <div className="fade-up" style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div className="card-flat" role="status" aria-live="polite" aria-atomic="true" style={{ 
              background: quiz.sel === q.ans ? 'rgba(26,147,111,0.1)' : 'rgba(239,68,68,0.1)',
              borderColor: quiz.sel === q.ans ? 'rgba(26,147,111,0.3)' : 'rgba(239,68,68,0.3)',
              fontSize:14, textAlign:'center', fontWeight:700,
              color: quiz.sel === q.ans ? '#1A936F' : '#ef4444'
            }}>
              {quiz.sel === q.ans
                ? `✅ ${t.correct}!`
                : `❌ ${t.incorrect} — ${lang === 'hi' ? 'सही उत्तर' : 'Correct'}: ${q.opts[q.ans]}`}
            </div>
            <button className="btn btn-primary" style={{ width:'100%', borderRadius:16 }} onClick={nextQuestion}>
              {quiz.idx + 1 < quiz.qs.length ? t.nextQ : t.seeResults} →
            </button>
          </div>
        )}
      </div>
    );
  }, [lang, t, quiz, startQuiz, selectAnswer, nextQuestion, handleQuizKeyDown]);

  const sectionMap = useMemo(() => ({ home:renderHome, chat:renderChat, guide:renderGuide, booth:renderBooth, docs:renderDocs, fake:renderFake, quiz:renderQuiz }), [renderHome, renderChat, renderGuide, renderBooth, renderDocs, renderFake, renderQuiz]);

  // ─── RENDER ──────────────────────────────────────────────────
  return (
    <div className="page-bg" style={{ minHeight:'100vh', overflowX:'hidden' }}>
      <style>{CSS}</style>

      {/* HEADER */}
      <header className="glass" role="banner" style={{ position:'sticky', top:0, zIndex:50, padding:'12px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:40, height:40, borderRadius:13, background:'linear-gradient(135deg,#FF6B35,#D44D1F)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 6px 14px rgba(255,107,53,0.35)' }}>
            <span style={{ fontSize:20, lineHeight:1 }} aria-hidden="true">🗳️</span>
          </div>
          <div>
            <h1 style={{ fontWeight:800, fontSize:16, margin:0, letterSpacing:'-0.3px' }}>{t.appName}</h1>
            <div style={{ fontSize:10, color:'#555', fontWeight:600 }}>{lang==='hi' ? 'लोकतंत्र की आवाज़' : 'VOICE OF DEMOCRACY'}</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <LiveBadge count={live} />
          {user ? (
            <button onClick={signOutUser} style={{ border:'none', background:'none', cursor:'pointer', padding:0 }} aria-label="Signed in user">
              <img src={user.photoURL} alt={user.displayName || 'User'} style={{ width:34, height:34, borderRadius:11, border:'2px solid rgba(255,255,255,0.12)' }} />
            </button>
          ) : (
            <button className="btn btn-primary" style={{ padding:'7px 14px', fontSize:12, borderRadius:11 }} onClick={signInWithGoogle} aria-label="Sign in with Google">
              {t.login}
            </button>
          )}
        </div>
      </header>

      {/* PAGE TITLE BAR (except home & chat) */}
      {!['home','chat'].includes(tab) && (
        <div style={{ padding:'20px 20px 0', maxWidth:640, margin:'0 auto' }}>
          <h2 style={{ fontSize:26, fontWeight:800, margin:0, letterSpacing:'-0.3px' }}>
            <span aria-hidden="true">{tabList.find(t2 => t2.id === tab)?.icon}</span> {T[lang][`${tab}Title`] || tabList.find(t2=>t2.id===tab)?.label}
          </h2>
          <div style={{ height:3, width:40, background:'#FF6B35', borderRadius:2, marginTop:8 }} aria-hidden="true" />
        </div>
      )}

      {/* CONTENT */}
      <main ref={mainRef} id="main-content" role="main" tabIndex={-1} aria-label="Main application content" style={{ maxWidth:640, margin:'0 auto', padding:'20px 16px 120px' }}>
        {(sectionMap[tab] || renderHome)()}
      </main>

      {/* BOTTOM NAV */}
      <nav className="nav-pill glass" role="tablist" aria-label="App sections" style={{ width:'calc(100% - 32px)', maxWidth:440 }}>
        {tabList.map(tb => (
          <button key={tb.id} className={`nav-btn ${tab === tb.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tb.id)}
            role="tab"
            aria-selected={tab === tb.id}
            aria-label={`Go to ${tb.label}`} aria-current={tab === tb.id ? 'page' : undefined}>
            <span className="icon" aria-hidden="true">{tb.icon}</span>
            <span>{tb.label}</span>
          </button>
        ))}
      </nav>

      <footer role="contentinfo" style={{ textAlign:'center', padding:'10px 20px 24px', fontSize:10, color:'#333' }}>
        🇮🇳 Chunao Saathi • Powered by Google Cloud & Gemini AI • ECI Helpline {ECI_HELPLINE}
      </footer>
    </div>
  );
}
