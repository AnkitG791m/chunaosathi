/**
 * @fileoverview Centralized constants for Chunao Saathi backend
 * Avoids magic numbers scattered across server.js
 */

/** Rate limiting window in milliseconds (15 minutes) */
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/** Max requests per IP per rate limit window */
export const RATE_LIMIT_MAX = 100;

/** Maximum allowed request body size */
export const MAX_BODY_SIZE = '10kb';

/** Maximum allowed string length after sanitization */
export const MAX_INPUT_LENGTH = 500;

/** Credit score increment for attending an event */
export const CREDIT_ATTEND_BONUS = 10;

/** Credit score penalty for a no-show */
export const CREDIT_NOSHOW_PENALTY = 5;

/** Default voter credit score on registration */
export const DEFAULT_CREDIT_SCORE = 100;

/** Default election event capacity */
export const DEFAULT_EVENT_CAPACITY = 500;

/** Gemini AI models to try in order of preference */
export const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
];

/** Max AI output tokens per response */
export const GEMINI_MAX_OUTPUT_TOKENS = 300;

/** AI model temperature (creativity level 0–1) */
export const GEMINI_TEMPERATURE = 0.7;

/** Known fake news claim patterns */
export const FAKE_NEWS_DB = [
  {
    keywords: ['evm', 'hack', 'rigged', 'bluetooth', 'wifi'],
    verdict: 'FALSE',
    explanation:
      'EVMs are standalone, air-gapped machines with no internet or Bluetooth connectivity. They cannot be remotely hacked. The Supreme Court of India has upheld EVM integrity multiple times.',
  },
  {
    keywords: ['nota', 'useless', 'cancel', 'invalid', 'rद्द'],
    verdict: 'FALSE',
    explanation:
      'NOTA (None Of The Above) is a valid constitutional right. It does NOT cancel an election. The candidate with the most votes still wins, but NOTA sends a powerful democratic message.',
  },
  {
    keywords: ['vote', 'sell', 'money', 'bribe', 'paisa'],
    verdict: 'ILLEGAL',
    explanation:
      'Selling or buying votes is a criminal offence under Section 171B of IPC. Report it immediately to ECI helpline 1950 or local police.',
  },
  {
    keywords: ['fake id', 'duplicate voter', 'bogus'],
    verdict: 'FALSE',
    explanation:
      'Voter list verification happens at multiple levels. Using a fake ID for voting is a criminal offence. ECI uses EPIC card photo verification.',
  },
];
