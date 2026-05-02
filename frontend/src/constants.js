/**
 * Application-wide constants for Chunao Saathi
 * Centralizes all magic numbers and configuration values
 */

/** Maximum chat messages to keep in memory */
export const MAX_CHAT_MESSAGES = 20;

/** Debounce delay for user input fields (ms) */
export const INPUT_DEBOUNCE_MS = 300;

/** Quiz questions per session */
export const QUIZ_QUESTION_COUNT = 10;

/** Credit score awarded for attending event */
export const CREDIT_ATTEND_BONUS = 10;

/** Credit score deducted for no-show */
export const CREDIT_NOSHOW_PENALTY = 5;

/** Minimum credit score threshold */
export const MIN_CREDIT_SCORE = 0;

/** Default event capacity */
export const DEFAULT_BOOTH_CAPACITY = 100;

/** ECI Voter Helpline Number */
export const ECI_HELPLINE = '1950';

/** Official ECI website */
export const ECI_WEBSITE = 'https://voters.eci.gov.in';

/** Supported languages */
export const SUPPORTED_LANGUAGES = ['hi', 'en', 'mr', 'ta'];

/** Default language */
export const DEFAULT_LANGUAGE = 'hi';

/** Remote config fetch interval (1 hour in ms) */
export const REMOTE_CONFIG_INTERVAL_MS = 3600000;

/** API rate limit window (15 minutes in ms) */
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/** API rate limit max requests per window */
export const RATE_LIMIT_MAX_REQUESTS = 100;

/** Max request body size */
export const MAX_BODY_SIZE = '10kb';

/** Max input string length after sanitization */
export const MAX_INPUT_LENGTH = 500;
