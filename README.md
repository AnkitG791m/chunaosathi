# 🗳️ Chunao Saathi — AI-Powered Election Education App

![Google Cloud](https://img.shields.io/badge/Google_Cloud-Run_asia--south1-4285F4?logo=googlecloud&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Auth_+_Firestore_+_FCM-FF6B35?logo=firebase)
![Gemini AI](https://img.shields.io/badge/Gemini_1.5_Pro-AI_Chatbot-8E75B2?logo=google)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791?logo=postgresql)
![React](https://img.shields.io/badge/React_18-Vite-61DAFB?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-20_LTS-339933?logo=nodedotjs)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?logo=docker)

**Chunao Saathi (चुनाव साथी)** is an AI-powered, multi-language election education web app that helps Indian voters — especially rural, elderly, migrant workers, and first-time voters — understand the election process, find polling booths, clear doubts, and fight misinformation.

---

## 🎯 Problem Statement

Millions of Indian voters face real barriers:
- Don't know the voting process or how to use EVM/NOTA
- Voter ID lost — don't know 12 alternative documents are valid
- Can't find their polling booth location
- Believe fake news (EVM hacking, voting closed, etc.)
- Language barriers (Hindi, Tamil, Marathi, Bengali)
- Migrant workers don't know their voting rights

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 AI Chatbot | Gemini 1.5 Pro answers election questions in 6 Indian languages |
| 📍 Booth Locator | Google Maps shows nearest polling booth |
| 🔍 Fake News Checker | AI fact-checks election rumours in real-time |
| 🎮 Knowledge Quiz | 10 randomized questions, scores saved to Firestore |
| 📋 Election Guide | 7-step animated election process timeline |
| 🪪 Document Checker | 12 valid ID alternatives to Voter ID |
| 🔔 Push Notifications | Election date reminders via Firebase FCM |
| 🗣️ Anonymous Doubts | EHSAAS system for anonymous questions |
| 📊 Credit Score | Civic participation score (attendance = bonus points) |
| 📴 Offline Mode | PWA works without internet |

---

## 🛠️ Tech Stack

### Frontend
- **React 18** + Vite + Tailwind CSS
- **PWA** (Progressive Web App, offline capable)

### Backend
- **Node.js 20** + Express.js
- **PostgreSQL** via Supabase
- **Docker** containerized

### Google Services (19 total)
| Service | Purpose |
|---|---|
| **Gemini 1.5 Pro** | AI chatbot for election Q&A |
| **Firebase Hosting** | Production deployment |
| **Firebase Auth** | Google Sign-In |
| **Firebase Firestore** | Real-time quiz scores, live attendance |
| **Firebase Analytics** | User event tracking |
| **Firebase Performance** | Load time monitoring |
| **Firebase Remote Config** | Feature flags without redeployment |
| **Firebase Cloud Messaging** | Election date push notifications |
| **Firebase App Check** | API security |
| **Google Maps JS API** | Interactive booth locator |
| **Google Places API** | Nearest booth search |
| **Google Geocoding API** | Address to coordinates |
| **Google Translate API** | 6-language dynamic translation |
| **Google Text-to-Speech** | Voice output for illiterate voters |
| **Google Speech-to-Text** | Voice input queries |
| **Cloud Run (asia-south1)** | Backend container deployment |
| **Cloud Build** | CI/CD pipeline |
| **Cloud Storage (GCS)** | QR code image storage |
| **Cloud Logging** | Backend structured logging |

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js 20+
- Firebase project (console.firebase.google.com)
- Google Cloud project with billing enabled

### 1. Clone the repo
```bash
git clone https://github.com/your-username/chunao-saathi.git
cd chunao-saathi
```

### 2. Backend setup
```bash
cd backend
cp .env.example .env
# Fill in your values in .env
npm install
npm run dev
```

### 3. Frontend setup
```bash
cd frontend
cp .env.example .env.local
# Fill in your Firebase config values
npm install
npm run dev
```

### 4. Database setup
```bash
# Run schema on Supabase SQL editor
# Copy contents of database/schema.sql and execute
```

---

## 🔐 Environment Variables

### backend/.env
```env
DATABASE_URL=postgresql://...
FIREBASE_PROJECT_ID=chunao-saathi
GOOGLE_CLOUD_PROJECT=chunao-saathi
GCS_BUCKET=chunao-saathi-storage
FRONTEND_URL=https://chunao-saathi.web.app
NODE_ENV=production
PORT=8080
```

### frontend/.env.local
```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=chunao-saathi.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=chunao-saathi
VITE_FIREBASE_STORAGE_BUCKET=chunao-saathi.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_FIREBASE_VAPID_KEY=...
VITE_GOOGLE_MAPS_KEY=...
VITE_GEMINI_API_KEY=...
VITE_API_URL=https://chunao-backend-xxxx-uc.a.run.app
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/health | Health check |
| GET | /api/events | Get all events |
| POST | /api/auth/register | Register voter |
| POST | /api/auth/login | Login voter |
| GET | /api/voter/:userId | Get voter profile |
| GET | /api/booths/:eventId | Get polling booths |
| POST | /api/booths/assign | Assign voter to booth |
| POST | /api/attendance/mark | Mark QR attendance |
| GET | /api/attendance/:eventId | Get attendance list |
| GET | /api/credit/:userId | Get credit score |
| POST | /api/credit/update | Update credit score |
| POST | /api/ehsaas/question | Submit anonymous question |
| GET | /api/ehsaas/:eventId | Get questions list |
| POST | /api/fakenews/check | Fact-check a claim |
| POST | /api/storage/upload-qr | Upload QR to GCS |

---

## 🗄️ Database Schema

9 tables: `voters`, `election_events`, `polling_booths`, `booth_assignments`, `attendance`, `credit_history`, `ehsaas_questions`, `appeals`, indexes for performance.

See `database/schema.sql` for full schema.

---

## 🚢 Deployment (Google Cloud)

```bash
# Deploy everything via Cloud Build (CI/CD)
gcloud builds submit --config cloudbuild.yaml

# Or deploy manually
cd backend && gcloud run deploy chunao-saathi-backend \
  --source . --region asia-south1 --allow-unauthenticated

cd frontend && npm run build
firebase deploy --only hosting
```

**Live URLs:**
- Frontend: https://chunao-saathi.web.app
- Backend: https://chunao-backend-xxxx-el.a.run.app

---

## 🧪 Testing

```bash
# Backend tests (45+ cases)
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

---

## 🌐 Languages Supported

Hindi • English • Marathi • Tamil • Bengali • Telugu

---

## 📞 Important Contacts

- **ECI Voter Helpline:** 1950
- **cVIGIL App:** Report election violations
- **Official site:** voters.eci.gov.in

---

## 🇮🇳 Social Impact

> *"Chunao Saathi targets 950 million registered Indian voters — making democracy accessible to everyone, regardless of language, literacy, or location."*

---

*Built for Hack2Skill — Election Process Education Challenge • April 2026*
