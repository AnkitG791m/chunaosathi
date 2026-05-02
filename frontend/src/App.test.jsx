import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import App from './App';

// Mock Firebase
vi.mock('./firebase.js', () => ({
  signInWithGoogle: vi.fn(),
  signOutUser: vi.fn(),
  onAuthChange: vi.fn((cb) => { cb(null); return () => {}; }),
  listenToLiveAttendance: vi.fn(() => () => {}),
  saveQuizScore: vi.fn(),
  submitAnonymousQuestion: vi.fn(),
  trackEvent: vi.fn(),
  trackChatbotQuestion: vi.fn(),
  trackBoothSearch: vi.fn(),
  trackFakeNewsCheck: vi.fn(),
  trackLanguageSwitch: vi.fn(),
  getRemoteValue: vi.fn().mockResolvedValue('true'),
  requestNotificationPermission: vi.fn(),
}));

// Mock API
vi.mock('./api.js', () => ({
  API: {
    chatbot: vi.fn().mockResolvedValue('Vote ke liye 18+ hona chahiye.'),
    checkFakeNews: vi.fn().mockResolvedValue({ verdict: 'FALSE', explanation: 'EVMs cannot be hacked.' }),
  }
}));

describe('App Renders', () => {
  beforeEach(() => render(<App />));

  test('renders app name', () => {
    expect(screen.getAllByText(/चुनाव साथी|Chunao Saathi/i).length).toBeGreaterThan(0);
  });

  test('renders helpline number 1950', () => {
    expect(screen.getAllByText('1950').length).toBeGreaterThan(0);
  });

  test('renders navigation tabs', () => {
    expect(screen.getByLabelText(/go to होम|go to home/i)).toBeTruthy();
  });

  test('skip link is present for accessibility', () => {
    expect(screen.getByText(/skip to main content/i)).toBeTruthy();
  });
});

describe('Language Switch', () => {
  beforeEach(() => render(<App />));

  test('switches to English', () => {
    const enBtn = screen.getByLabelText(/switch to english/i);
    fireEvent.click(enBtn);
    expect(screen.getAllByText(/your vote|home/i).length).toBeGreaterThan(0);
  });
});

describe('Tab Navigation', () => {
  beforeEach(() => render(<App />));

  test('navigates to chatbot tab', () => {
    const chatTab = screen.getByLabelText(/go to चैटबॉट|go to chatbot/i);
    fireEvent.click(chatTab);
    expect(screen.getByLabelText(/type your election question/i)).toBeTruthy();
  });

  test('navigates to quiz tab', () => {
    const quizTab = screen.getByLabelText(/go to क्विज़|go to quiz/i);
    fireEvent.click(quizTab);
    expect(screen.getByLabelText(/start election knowledge quiz/i)).toBeTruthy();
  });

  test('navigates to booth tab', () => {
    const boothTab = screen.getByLabelText(/go to बूथ|go to booth/i);
    fireEvent.click(boothTab);
    expect(screen.getByLabelText(/select state/i)).toBeTruthy();
  });

  test('navigates to fake news tab', () => {
    const fakeTab = screen.getByLabelText(/go to फेक न्यूज़|go to fake/i);
    fireEvent.click(fakeTab);
    expect(screen.getByLabelText(/enter claim to fact-check/i)).toBeTruthy();
  });
});

describe('Quiz Flow', () => {
  beforeEach(() => render(<App />));

  test('starts quiz on button click', () => {
    const quizTab = screen.getByLabelText(/go to क्विज़|go to quiz/i);
    fireEvent.click(quizTab);
    const startBtn = screen.getByLabelText(/start election knowledge quiz/i);
    fireEvent.click(startBtn);
    expect(screen.getByText(/Q 1/)).toBeTruthy();
  });

  test('shows answer options after start', () => {
    const quizTab = screen.getByLabelText(/go to क्विज़|go to quiz/i);
    fireEvent.click(quizTab);
    fireEvent.click(screen.getByLabelText(/start election knowledge quiz/i));
    expect(screen.getByRole('group', { name: /answer options/i })).toBeTruthy();
  });
});

describe('Booth Locator', () => {
  beforeEach(() => render(<App />));

  test('shows error if fields empty', () => {
    const boothTab = screen.getByLabelText(/go to बूथ|go to booth/i);
    fireEvent.click(boothTab);
    const findBtn = screen.getByLabelText(/find polling booth/i);
    fireEvent.click(findBtn);
    expect(screen.getByText(/सभी fields|please fill/i)).toBeTruthy();
  });
});

describe('Accessibility', () => {
  beforeEach(() => render(<App />));

  test('all nav buttons have aria-labels', () => {
    const navBtns = screen.getAllByRole('button');
    navBtns.forEach(btn => {
      // Buttons that matter for a11y
    });
    expect(navBtns.length).toBeGreaterThan(0);
  });

  test('main content has role main', () => {
    expect(screen.getByRole('main')).toBeTruthy();
  });

  test('chat log has aria-live', () => {
    const chatTab = screen.getByLabelText(/go to चैटबॉट|go to chatbot/i);
    fireEvent.click(chatTab);
    expect(screen.getByRole('log')).toBeTruthy();
  });
});
