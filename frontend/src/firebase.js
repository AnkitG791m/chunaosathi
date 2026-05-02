// frontend/src/firebase.js
// Chunao Saathi — All Google/Firebase Services Integrated

import { initializeApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, signInWithPopup,
  signOut, onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore, collection, doc, setDoc, getDoc,
  onSnapshot, query, orderBy, serverTimestamp, addDoc
} from 'firebase/firestore';
import { getAnalytics, logEvent } from 'firebase/analytics';
import { getPerformance, trace } from 'firebase/performance';
import {
  getRemoteConfig, fetchAndActivate, getValue
} from 'firebase/remote-config';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// ─── FIREBASE CONFIG (from .env.local) ───────────────────────────
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);

// ─── SERVICE INSTANCES ────────────────────────────────────────────
export const auth      = getAuth(app);
export const db        = getFirestore(app);
export const analytics = getAnalytics(app);
export const perf      = getPerformance(app);
export const remoteConfig = getRemoteConfig(app);
const googleProvider   = new GoogleAuthProvider();

// ─── 1. FIREBASE AUTH — Google Sign In ───────────────────────────
/**
 * Sign in with Google popup
 * @returns {Promise<Object>} Firebase user object
 */
export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  logEvent(analytics, 'login', { method: 'Google' });
  return result.user;
};

/**
 * Sign out current user
 */
export const signOutUser = async () => {
  logEvent(analytics, 'logout');
  await signOut(auth);
};

/**
 * Listen to auth state changes
 * @param {Function} callback
 */
export const onAuthChange = (callback) => onAuthStateChanged(auth, callback);

// ─── 2. FIRESTORE — Real-time Attendance ─────────────────────────
/**
 * Listen to live voter attendance for an event
 * @param {string} eventId
 * @param {Function} callback
 * @returns {Function} unsubscribe function
 */
export const listenToLiveAttendance = (eventId, callback) => {
  const q = query(
    collection(db, 'events', eventId, 'attendance'),
    orderBy('markedAt', 'desc')
  );
  return onSnapshot(q, (snap) =>
    callback({
      count: snap.size,
      latest: snap.docs.slice(0, 5).map(d => d.data())
    })
  );
};

// ─── 3. FIRESTORE — Save Quiz Score ──────────────────────────────
/**
 * Save voter quiz score to Firestore
 * @param {string} userId
 * @param {Object} scoreData - { score, total, timestamp }
 */
export const saveQuizScore = async (userId, scoreData) => {
  await setDoc(doc(db, 'quizScores', userId), {
    ...scoreData,
    updatedAt: serverTimestamp()
  }, { merge: true });
  logEvent(analytics, 'quiz_completed', {
    score: scoreData.score,
    total: scoreData.total
  });
};

// ─── 4. FIRESTORE — Submit Anonymous Question (EHSAAS) ───────────
/**
 * Submit an anonymous election doubt
 * @param {string} eventId
 * @param {Object} questionData
 */
export const submitAnonymousQuestion = async (eventId, questionData) => {
  const ref = collection(db, 'events', eventId, 'ehsaas');
  await addDoc(ref, { ...questionData, submittedAt: serverTimestamp() });
  logEvent(analytics, 'ehsaas_question_submitted', { eventId });
};

// ─── 5. FIRESTORE — Listen to Live Questions ─────────────────────
/**
 * Listen to live EHSAAS questions for event
 * @param {string} eventId
 * @param {Function} callback
 */
export const listenToQuestions = (eventId, callback) => {
  const q = query(
    collection(db, 'events', eventId, 'ehsaas'),
    orderBy('submittedAt', 'desc')
  );
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
};

// ─── 6. FIRESTORE — Save Booth Assignment ────────────────────────
/**
 * Save voter booth assignment to Firestore
 * @param {string} eventId
 * @param {Object} boothData
 */
export const saveBoothToFirestore = async (eventId, boothData) => {
  await setDoc(
    doc(db, 'events', eventId, 'booths', `booth_${boothData.boothNumber}`),
    { ...boothData, createdAt: serverTimestamp() }
  );
};

// ─── 7. GOOGLE ANALYTICS — Track Events ──────────────────────────
/**
 * Track custom analytics event
 * @param {string} eventName
 * @param {Object} params
 */
export const trackEvent = (eventName, params = {}) => {
  logEvent(analytics, eventName, params);
};

// Pre-defined tracking helpers
export const trackChatbotQuestion = (language) =>
  logEvent(analytics, 'chatbot_question', { language });

export const trackBoothSearch = (state, district) =>
  logEvent(analytics, 'booth_search', { state, district });

export const trackFakeNewsCheck = (verdict) =>
  logEvent(analytics, 'fake_news_checked', { verdict });

export const trackLanguageSwitch = (from, to) =>
  logEvent(analytics, 'language_switched', { from, to });

export const trackVoiceInput = () =>
  logEvent(analytics, 'voice_input_used');

// ─── 8. FIREBASE PERFORMANCE MONITORING ──────────────────────────
/**
 * Wrap a function with performance monitoring trace
 * @param {string} traceName
 * @param {Function} fn
 * @returns {Promise<any>}
 */
export const trackPerformance = async (traceName, fn) => {
  const t = trace(perf, traceName);
  t.start();
  const result = await fn();
  t.stop();
  return result;
};

// ─── 9. FIREBASE REMOTE CONFIG ───────────────────────────────────
remoteConfig.settings.minimumFetchIntervalMillis = 3600000;
remoteConfig.defaultConfig = {
  quiz_question_count: '10',
  registration_open: 'true',
  max_booth_capacity: '500',
  credit_vote_bonus: '10',
  credit_noshow_penalty: '5',
  chatbot_enabled: 'true',
  fake_news_enabled: 'true',
  voice_assistant_enabled: 'false'
};

/**
 * Get a remote config value
 * @param {string} key
 * @returns {Promise<string>}
 */
export const getRemoteValue = async (key) => {
  await fetchAndActivate(remoteConfig);
  return getValue(remoteConfig, key).asString();
};

// ─── 10. FIREBASE CLOUD MESSAGING (Push Notifications) ───────────
/**
 * Request push notification permission and get FCM token
 * @returns {Promise<string|null>} FCM token or null
 */
export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const messaging = getMessaging(app);
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
      });
      logEvent(analytics, 'notification_enabled');
      return token;
    }
    return null;
  } catch (err) {
    console.error('Notification permission error:', err);
    return null;
  }
};

/**
 * Listen for foreground FCM messages
 * @param {Function} callback
 */
export const onForegroundMessage = (callback) => {
  const messaging = getMessaging(app);
  return onMessage(messaging, callback);
};

export default app;
