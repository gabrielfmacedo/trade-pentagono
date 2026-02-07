
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Player, PlayerStatus, TimeBankOption, HandRecord, Scenario, User, TrainingGoal, RangeData } from './types.ts';
import PlayerSeat from './components/PlayerSeat.tsx';
import Sidebar from './components/Sidebar.tsx';
import StopTrainingModal from './components/StopTrainingModal.tsx';
import SessionReportModal from './components/SessionReportModal.tsx';
import RestartConfirmationModal from './components/RestartConfirmationModal.tsx';
import SpotInfoModal from './components/SpotInfoModal.tsx';
import ConfigModal from './components/ConfigModal.tsx';
import ScenarioCreatorModal from './components/ScenarioCreatorModal.tsx';
import SelectionScreen from './components/SelectionScreen.tsx';
import LoginScreen from './components/LoginScreen.tsx';
import RegisterScreen from './components/RegisterScreen.tsx';
import AdminMemberModal from './components/AdminMemberModal.tsx';
import TrainingSetupScreen from './components/TrainingSetupScreen.tsx';

const BIG_BLIND_VALUE = 20;
const SCENARIOS_STORAGE_KEY = 'lab11_scenarios_v1';
const MEMBERS_STORAGE_KEY = 'gto_members';

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const SUITS = ['c', 'd', 'h', 's'];

const getSuitSymbol = (suitChar: string) => {
  switch (suitChar) {
    case 'c': return '♣';
    case 'd': return '♦';
    case 'h': return '♥';
    case 's': return '♠';
    default: return suitChar;
  }
};

const getSuitColor = (suitChar: string) => {
  switch (suitChar) {
    case 'c': return 'text-emerald-600';
    case 'd': return 'text-blue-600';
    case 'h': return 'text-red-600';
    case 's': return 'text-gray-900';
    default: return 'text-black';
  }
};

const getTablePositions = (count: number) => {
  if (count === 2) return ['SB', 'BB'];
  if (count <= 4) return ['CO', 'BTN', 'SB', 'BB'];
  if (count <= 6) return ['BTN', 'SB', 'BB', 'LJ', 'HJ', 'CO'];
  return ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'LJ', 'HJ', 'CO'];
};

const getPreflopOrder = (count: number) => {
  if (count === 2) return ['SB', 'BB'];
  if (count <= 4) return ['CO', 'BTN', 'SB', 'BB'];
  if (count <= 6) return ['LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  return ['UTG', 'UTG+1', 'MP', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
};

const CUSTOM_PALETTE = [
  '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1', '#14b8a6',
];

const getActionColor = (label: string, index: number): string => {
  const l = label.toLowerCase();
  if (l.includes('fold')) return '#334155';
  if (l.includes('call') || l.includes('pagar') || l === 'limp' || l === 'check') return '#10b981';
  if (l.includes('raise') || l === 'rfi' || l.includes('3-bet') || l.includes('4-bet') || l.includes('aumentar') || l.includes('iso')) return '#f59e0b';
  if (l.includes('all-in') || l.includes('shove')) return '#ef4444';
  return CUSTOM_PALETTE[index % CUSTOM_PALETTE.length];
};

const generateCardsFromKey = (key: string): string[] => {
  if (key.length === 4) return [key.substring(0, 2), key.substring(2, 4)];
  if (key.length === 2 && key[0] === key[1]) {
    const rank = key[0];
    const s1 = SUITS[Math.floor(Math.random() * SUITS.length)];
    let s2 = SUITS[Math.floor(Math.random() * SUITS.length)];
    while (s1 === s2) s2 = SUITS[Math.floor(Math.random() * SUITS.length)];
    return [rank + s1, rank + s2];
  }
  if (key.endsWith('s')) {
    const r1 = key[0]; const r2 = key[1];
    const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
    return [r1 + suit, r2 + suit];
  }
  if (key.endsWith('o')) {
    const r1 = key[0]; const r2 = key[1];
    const s1 = SUITS[Math.floor(Math.random() * SUITS.length)];
    let s2 = SUITS[Math.floor(Math.random() * SUITS.length)];
    while (s1 === s2) s2 = SUITS[Math.floor(Math.random() * SUITS.length)];
    return [r1 + s1, r2 + s2];
  }
  return ['As', 'Ad'];
};

const getActiveHandsFromRange = (ranges: RangeData): string[] => {
  return Object.keys(ranges).filter(key => {
    const frequencies = ranges[key];
    const totalFreq = Object.values(frequencies).reduce((sum, f) => sum + (f as number), 0);
    return totalFreq > 0;
  });
};

const SYSTEM_DEFAULT_MEMBERS: User[] = [
  {
    "name": "ADMIN PENTÁGONO",
    "email": "gabrielfmacedo@ymail.com",
    "password": "admin",
    "isAdmin": true,
    "mustChangePassword": false,
    "hasMultiLoginAttempt": true
  },
  {
    "name": "GABRIEL POKER",
    "email": "gabrielfpoker@gmail.com",
    "password": "poker",
    "isAdmin": false,
    "mustChangePassword": false,
    "hasMultiLoginAttempt": true
  }
];

const SYSTEM_DEFAULT_SCENARIOS: Scenario[] = [
  {
    "id": "sc-1770420226954",
    "name": "OPEN SHOVE - 1bb",
    "description": "",
    "videoLink": "",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "OPEN SHOVE",
    "playerCount": 9,
    "heroPos": "UTG",
    "opponents": [],
    "stackBB": 1,
    "ranges": {
      "22": { "ALL-IN": 100 }, "33": { "ALL-IN": 100 }, "44": { "ALL-IN": 100 }, "55": { "ALL-IN": 100 }, "66": { "ALL-IN": 100 }, "77": { "ALL-IN": 100 }, "88": { "ALL-IN": 100 }, "99": { "ALL-IN": 100 }, "AA": { "ALL-IN": 100 }, "AKs": { "ALL-IN": 100 }, "AQs": { "ALL-IN": 100 }, "AJs": { "ALL-IN": 100 }, "ATs": { "ALL-IN": 100 }, "A9s": { "ALL-IN": 100 }, "A8s": { "ALL-IN": 100 }, "A7s": { "ALL-IN": 100 }, "A6s": { "ALL-IN": 100 }, "A5s": { "ALL-IN": 100 }, "A4s": { "ALL-IN": 100 }, "A3s": { "ALL-IN": 100 }, "A2s": { "ALL-IN": 100 }, "AKo": { "ALL-IN": 100 }, "KK": { "ALL-IN": 100 }, "KQs": { "ALL-IN": 100 }, "KJs": { "ALL-IN": 100 }, "KTs": { "ALL-IN": 100 }, "K9s": { "ALL-IN": 100 }, "K8s": { "ALL-IN": 100 }, "K7s": { "ALL-IN": 100 }, "K6s": { "ALL-IN": 100 }, "Q8s": { "ALL-IN": 100 }, "QTs": { "ALL-IN": 100 }, "Q9s": { "ALL-IN": 100 }, "T9s": { "ALL-IN": 100 }, "J9s": { "ALL-IN": 100 }, "JTs": { "ALL-IN": 100 }, "QJs": { "ALL-IN": 100 }, "QQ": { "ALL-IN": 100 }, "TT": { "ALL-IN": 100 }, "JJ": { "ALL-IN": 100 }, "T8s": { "ALL-IN": 100 }, "98s": { "ALL-IN": 100 }, "87s": { "ALL-IN": 100 }, "A7o": { "ALL-IN": 100 }, "A8o": { "ALL-IN": 100 }, "A9o": { "ALL-IN": 100 }, "ATo": { "ALL-IN": 100 }, "AJo": { "ALL-IN": 100 }, "AQo": { "ALL-IN": 100 }, "KQo": { "ALL-IN": 100 }, "KJo": { "ALL-IN": 100 }, "KTo": { "ALL-IN": 100 }, "QJo": { "ALL-IN": 100 }, "K5s": { "Fold": 100 }, "K4s": { "Fold": 100 }, "K3s": { "Fold": 100 }, "K2s": { "Fold": 100 }, "Q7s": { "Fold": 100 }, "Q6s": { "Fold": 100 }, "Q5s": { "Fold": 100 }, "Q4s": { "Fold": 100 }, "Q3s": { "Fold": 100 }, "Q2s": { "Fold": 100 }, "J8s": { "Fold": 100 }, "J7s": { "Fold": 100 }, "J6s": { "Fold": 100 }, "J5s": { "Fold": 100 }, "J4s": { "Fold": 100 }, "J3s": { "Fold": 100 }, "J2s": { "Fold": 100 }, "T7s": { "Fold": 100 }, "T6s": { "Fold": 100 }, "T5s": { "Fold": 100 }, "T4s": { "Fold": 100 }, "T3s": { "Fold": 100 }, "T2s": { "Fold": 100 }, "97s": { "Fold": 100 }, "96s": { "Fold": 100 }, "95s": { "Fold": 100 }, "94s": { "Fold": 100 }, "93s": { "Fold": 100 }, "92s": { "Fold": 100 }, "86s": { "Fold": 100 }, "85s": { "Fold": 100 }, "84s": { "Fold": 100 }, "83s": { "Fold": 100 }, "82s": { "Fold": 100 }, "72s": { "Fold": 100 }, "73s": { "Fold": 100 }, "74s": { "Fold": 100 }, "75s": { "Fold": 100 }, "76s": { "Fold": 100 }, "65s": { "Fold": 100 }, "64s": { "Fold": 100 }, "63s": { "Fold": 100 }, "62s": { "Fold": 100 }, "54s": { "Fold": 100 }, "53s": { "Fold": 100 }, "52s": { "Fold": 100 }, "43s": { "Fold": 100 }, "42s": { "Fold": 100 }, "32s": { "Fold": 100 }, "QTo": { "Fold": 100 }, "Q9o": { "Fold": 100 }, "Q8o": { "Fold": 100 }, "Q7o": { "Fold": 100 }, "Q6o": { "Fold": 100 }, "Q5o": { "Fold": 100 }, "Q4o": { "Fold": 100 }, "Q3o": { "Fold": 100 }, "Q2o": { "Fold": 100 }, "J2o": { "Fold": 100 }, "J3o": { "Fold": 100 }, "J4o": { "Fold": 100 }, "J5o": { "Fold": 100 }, "J6o": { "Fold": 100 }, "J7o": { "Fold": 100 }, "J8o": { "Fold": 100 }, "J9o": { "Fold": 100 }, "JTo": { "Fold": 100 }, "T9o": { "Fold": 100 }, "T8o": { "Fold": 100 }, "T7o": { "Fold": 100 }, "T6o": { "Fold": 100 }, "T5o": { "Fold": 100 }, "T4o": { "Fold": 100 }, "T3o": { "Fold": 100 }, "T2o": { "Fold": 100 }, "98o": { "Fold": 100 }, "97o": { "Fold": 100 }, "96o": { "Fold": 100 }, "95o": { "Fold": 100 }, "94o": { "Fold": 100 }, "93o": { "Fold": 100 }, "92o": { "Fold": 100 }, "87o": { "Fold": 100 }, "86o": { "Fold": 100 }, "85o": { "Fold": 100 }, "84o": { "Fold": 100 }, "83o": { "Fold": 100 }, "82o": { "Fold": 100 }, "76o": { "Fold": 100 }, "75o": { "Fold": 100 }, "74o": { "Fold": 100 }, "73o": { "Fold": 100 }, "72o": { "Fold": 100 }, "65o": { "Fold": 100 }, "64o": { "Fold": 100 }, "63o": { "Fold": 100 }, "62o": { "Fold": 100 }, "54o": { "Fold": 100 }, "53o": { "Fold": 100 }, "52o": { "Fold": 100 }, "43o": { "Fold": 100 }, "42o": { "Fold": 100 }, "32o": { "Fold": 100 }, "K9o": { "Fold": 100 }, "K8o": { "Fold": 100 }, "K7o": { "Fold": 100 }, "K6o": { "Fold": 100 }, "K5o": { "Fold": 100 }, "K4o": { "Fold": 100 }, "K3o": { "Fold": 100 }, "K2o": { "Fold": 100 }, "A6o": { "Fold": 100 }, "A5o": { "Fold": 100 }, "A4o": { "Fold": 100 }, "A3o": { "Fold": 100 }, "A2o": { "Fold": 100 }
    },
    "customActions": ["Fold", "ALL-IN"],
    "heroBetSize": 2.5
  },
  {
    "id": "sc-1770420381213",
    "name": "OPEN SHOVE - 1bb",
    "description": "",
    "videoLink": "",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "OPEN SHOVE",
    "playerCount": 9,
    "heroPos": "UTG+1",
    "opponents": [],
    "stackBB": 1,
    "ranges": {
      "22": { "ALL-IN": 100 }, "33": { "ALL-IN": 100 }, "44": { "ALL-IN": 100 }, "55": { "ALL-IN": 100 }, "66": { "ALL-IN": 100 }, "77": { "ALL-IN": 100 }, "88": { "ALL-IN": 100 }, "99": { "ALL-IN": 100 }, "AA": { "ALL-IN": 100 }, "AKs": { "ALL-IN": 100 }, "AQs": { "ALL-IN": 100 }, "AJs": { "ALL-IN": 100 }, "ATs": { "ALL-IN": 100 }, "A9s": { "ALL-IN": 100 }, "A8s": { "ALL-IN": 100 }, "A7s": { "ALL-IN": 100 }, "A6s": { "ALL-IN": 100 }, "A5s": { "ALL-IN": 100 }, "A4s": { "ALL-IN": 100 }, "A3s": { "ALL-IN": 100 }, "A2s": { "ALL-IN": 100 }, "AKo": { "ALL-IN": 100 }, "KK": { "ALL-IN": 100 }, "KQs": { "ALL-IN": 100 }, "KJs": { "ALL-IN": 100 }, "KTs": { "ALL-IN": 100 }, "K9s": { "ALL-IN": 100 }, "K8s": { "ALL-IN": 100 }, "K7s": { "ALL-IN": 100 }, "K6s": { "ALL-IN": 100 }, "Q8s": { "ALL-IN": 100 }, "QTs": { "ALL-IN": 100 }, "Q9s": { "ALL-IN": 100 }, "T9s": { "ALL-IN": 100 }, "J9s": { "ALL-IN": 100 }, "JTs": { "ALL-IN": 100 }, "QJs": { "ALL-IN": 100 }, "QQ": { "ALL-IN": 100 }, "TT": { "ALL-IN": 100 }, "JJ": { "ALL-IN": 100 }, "T8s": { "ALL-IN": 100 }, "98s": { "ALL-IN": 100 }, "87s": { "ALL-IN": 100 }, "A7o": { "ALL-IN": 100 }, "A8o": { "ALL-IN": 100 }, "A9o": { "ALL-IN": 100 }, "ATo": { "ALL-IN": 100 }, "AJo": { "ALL-IN": 100 }, "AQo": { "ALL-IN": 100 }, "KQo": { "ALL-IN": 100 }, "KJo": { "ALL-IN": 100 }, "KTo": { "ALL-IN": 100 }, "QJo": { "ALL-IN": 100 }, "K5s": { "ALL-IN": 100 }, "K4s": { "Fold": 100 }, "K3s": { "Fold": 100 }, "K2s": { "Fold": 100 }, "Q7s": { "Fold": 100 }, "Q6s": { "Fold": 100 }, "Q5s": { "Fold": 100 }, "Q4s": { "Fold": 100 }, "Q3s": { "Fold": 100 }, "Q2s": { "Fold": 100 }, "J8s": { "Fold": 100 }, "J7s": { "Fold": 100 }, "J6s": { "Fold": 100 }, "J5s": { "Fold": 100 }, "J4s": { "Fold": 100 }, "J3s": { "Fold": 100 }, "J2s": { "Fold": 100 }, "T7s": { "Fold": 100 }, "T6s": { "Fold": 100 }, "T5s": { "Fold": 100 }, "T4s": { "Fold": 100 }, "T3s": { "Fold": 100 }, "T2s": { "Fold": 100 }, "97s": { "Fold": 100 }, "96s": { "Fold": 100 }, "95s": { "Fold": 100 }, "94s": { "Fold": 100 }, "93s": { "Fold": 100 }, "92s": { "Fold": 100 }, "86s": { "Fold": 100 }, "85s": { "Fold": 100 }, "84s": { "Fold": 100 }, "83s": { "Fold": 100 }, "82s": { "Fold": 100 }, "72s": { "Fold": 100 }, "73s": { "Fold": 100 }, "74s": { "Fold": 100 }, "75s": { "Fold": 100 }, "76s": { "Fold": 100 }, "65s": { "Fold": 100 }, "64s": { "Fold": 100 }, "63s": { "Fold": 100 }, "62s": { "Fold": 100 }, "54s": { "Fold": 100 }, "53s": { "Fold": 100 }, "52s": { "Fold": 100 }, "43s": { "Fold": 100 }, "42s": { "Fold": 100 }, "32s": { "Fold": 100 }, "QTo": { "ALL-IN": 100 }, "Q9o": { "Fold": 100 }, "Q8o": { "Fold": 100 }, "Q7o": { "Fold": 100 }, "Q6o": { "Fold": 100 }, "Q5o": { "Fold": 100 }, "Q4o": { "Fold": 100 }, "Q3o": { "Fold": 100 }, "Q2o": { "Fold": 100 }, "J2o": { "Fold": 100 }, "J3o": { "Fold": 100 }, "J4o": { "Fold": 100 }, "J5o": { "Fold": 100 }, "J6o": { "Fold": 100 }, "J7o": { "Fold": 100 }, "J8o": { "Fold": 100 }, "J9o": { "Fold": 100 }, "JTo": { "ALL-IN": 100 }, "T9o": { "Fold": 100 }, "T8o": { "Fold": 100 }, "T7o": { "Fold": 100 }, "T6o": { "Fold": 100 }, "T5o": { "Fold": 100 }, "T4o": { "Fold": 100 }, "T3o": { "Fold": 100 }, "T2o": { "Fold": 100 }, "98o": { "Fold": 100 }, "97o": { "Fold": 100 }, "96o": { "Fold": 100 }, "95o": { "Fold": 100 }, "94o": { "Fold": 100 }, "93o": { "Fold": 100 }, "92o": { "Fold": 100 }, "87o": { "Fold": 100 }, "86o": { "Fold": 100 }, "85o": { "Fold": 100 }, "84o": { "Fold": 100 }, "83o": { "Fold": 100 }, "82o": { "Fold": 100 }, "76o": { "Fold": 100 }, "75o": { "Fold": 100 }, "74o": { "Fold": 100 }, "73o": { "Fold": 100 }, "72o": { "Fold": 100 }, "65o": { "Fold": 100 }, "64o": { "Fold": 100 }, "63o": { "Fold": 100 }, "62o": { "Fold": 100 }, "54o": { "Fold": 100 }, "53o": { "Fold": 100 }, "52o": { "Fold": 100 }, "43o": { "Fold": 100 }, "42o": { "Fold": 100 }, "32o": { "Fold": 100 }, "K9o": { "Fold": 100 }, "K8o": { "Fold": 100 }, "K7o": { "Fold": 100 }, "K6o": { "Fold": 100 }, "K5o": { "Fold": 100 }, "K4o": { "Fold": 100 }, "K3o": { "Fold": 100 }, "K2o": { "Fold": 100 }, "A6o": { "ALL-IN": 100 }, "A5o": { "ALL-IN": 100 }, "A4o": { "Fold": 100 }, "A3o": { "Fold": 100 }, "A2o": { "Fold": 100 }
    },
    "customActions": ["Fold", "ALL-IN"],
    "heroBetSize": 2.5
  },
  {
    "id": "sc-1770420445370",
    "name": "OPEN SHOVE - 1bb",
    "description": "",
    "videoLink": "",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "OPEN SHOVE",
    "playerCount": 9,
    "heroPos": "MP",
    "opponents": [],
    "stackBB": 1,
    "ranges": {
      "22": { "ALL-IN": 100 }, "33": { "ALL-IN": 100 }, "44": { "ALL-IN": 100 }, "55": { "ALL-IN": 100 }, "66": { "ALL-IN": 100 }, "77": { "ALL-IN": 100 }, "88": { "ALL-IN": 100 }, "99": { "ALL-IN": 100 }, "AA": { "ALL-IN": 100 }, "AKs": { "ALL-IN": 100 }, "AQs": { "ALL-IN": 100 }, "AJs": { "ALL-IN": 100 }, "ATs": { "ALL-IN": 100 }, "A9s": { "ALL-IN": 100 }, "A8s": { "ALL-IN": 100 }, "A7s": { "ALL-IN": 100 }, "A6s": { "ALL-IN": 100 }, "A5s": { "ALL-IN": 100 }, "A4s": { "ALL-IN": 100 }, "A3s": { "ALL-IN": 100 }, "A2s": { "ALL-IN": 100 }, "AKo": { "ALL-IN": 100 }, "KK": { "ALL-IN": 100 }, "KQs": { "ALL-IN": 100 }, "KJs": { "ALL-IN": 100 }, "KTs": { "ALL-IN": 100 }, "K9s": { "ALL-IN": 100 }, "K8s": { "ALL-IN": 100 }, "K7s": { "ALL-IN": 100 }, "K6s": { "ALL-IN": 100 }, "Q8s": { "ALL-IN": 100 }, "QTs": { "ALL-IN": 100 }, "Q9s": { "ALL-IN": 100 }, "T9s": { "ALL-IN": 100 }, "J9s": { "ALL-IN": 100 }, "JTs": { "ALL-IN": 100 }, "QJs": { "ALL-IN": 100 }, "QQ": { "ALL-IN": 100 }, "TT": { "ALL-IN": 100 }, "JJ": { "ALL-IN": 100 }, "T8s": { "ALL-IN": 100 }, "98s": { "ALL-IN": 100 }, "87s": { "ALL-IN": 100 }, "A7o": { "ALL-IN": 100 }, "A8o": { "ALL-IN": 100 }, "A9o": { "ALL-IN": 100 }, "ATo": { "ALL-IN": 100 }, "AJo": { "ALL-IN": 100 }, "AQo": { "ALL-IN": 100 }, "KQo": { "ALL-IN": 100 }, "KJo": { "ALL-IN": 100 }, "KTo": { "ALL-IN": 100 }, "QJo": { "ALL-IN": 100 }, "K5s": { "ALL-IN": 100 }, "K4s": { "ALL-IN": 100 }, "K3s": { "Fold": 100 }, "K2s": { "Fold": 100 }, "Q7s": { "Fold": 100 }, "Q6s": { "Fold": 100 }, "Q5s": { "Fold": 100 }, "Q4s": { "Fold": 100 }, "Q3s": { "Fold": 100 }, "Q2s": { "Fold": 100 }, "J8s": { "ALL-IN": 100 }, "J7s": { "Fold": 100 }, "J6s": { "Fold": 100 }, "J5s": { "Fold": 100 }, "J4s": { "Fold": 100 }, "J3s": { "Fold": 100 }, "J2s": { "Fold": 100 }, "T7s": { "Fold": 100 }, "T6s": { "Fold": 100 }, "T5s": { "Fold": 100 }, "T4s": { "Fold": 100 }, "T3s": { "Fold": 100 }, "T2s": { "Fold": 100 }, "97s": { "Fold": 100 }, "96s": { "Fold": 100 }, "95s": { "Fold": 100 }, "94s": { "Fold": 100 }, "93s": { "Fold": 100 }, "92s": { "Fold": 100 }, "86s": { "Fold": 100 }, "85s": { "Fold": 100 }, "84s": { "Fold": 100 }, "83s": { "Fold": 100 }, "82s": { "Fold": 100 }, "72s": { "Fold": 100 }, "73s": { "Fold": 100 }, "74s": { "Fold": 100 }, "75s": { "Fold": 100 }, "76s": { "Fold": 100 }, "65s": { "Fold": 100 }, "64s": { "Fold": 100 }, "63s": { "Fold": 100 }, "62s": { "Fold": 100 }, "54s": { "Fold": 100 }, "53s": { "Fold": 100 }, "52s": { "Fold": 100 }, "43s": { "Fold": 100 }, "42s": { "Fold": 100 }, "32s": { "Fold": 100 }, "QTo": { "ALL-IN": 100 }, "Q9o": { "Fold": 100 }, "Q8o": { "Fold": 100 }, "Q7o": { "Fold": 100 }, "Q6o": { "Fold": 100 }, "Q5o": { "Fold": 100 }, "Q4o": { "Fold": 100 }, "Q3o": { "Fold": 100 }, "Q2o": { "Fold": 100 }, "J2o": { "Fold": 100 }, "J3o": { "Fold": 100 }, "J4o": { "Fold": 100 }, "J5o": { "Fold": 100 }, "J6o": { "Fold": 100 }, "J7o": { "Fold": 100 }, "J8o": { "Fold": 100 }, "J9o": { "Fold": 100 }, "JTo": { "ALL-IN": 100 }, "T9o": { "Fold": 100 }, "T8o": { "Fold": 100 }, "T7o": { "Fold": 100 }, "T6o": { "Fold": 100 }, "T5o": { "Fold": 100 }, "T4o": { "Fold": 100 }, "T3o": { "Fold": 100 }, "T2o": { "Fold": 100 }, "98o": { "Fold": 100 }, "97o": { "Fold": 100 }, "96o": { "Fold": 100 }, "95o": { "Fold": 100 }, "94o": { "Fold": 100 }, "93o": { "Fold": 100 }, "92o": { "Fold": 100 }, "87o": { "Fold": 100 }, "86o": { "Fold": 100 }, "85o": { "Fold": 100 }, "84o": { "Fold": 100 }, "83o": { "Fold": 100 }, "82o": { "Fold": 100 }, "76o": { "Fold": 100 }, "75o": { "Fold": 100 }, "74o": { "Fold": 100 }, "73o": { "Fold": 100 }, "72o": { "Fold": 100 }, "65o": { "Fold": 100 }, "64o": { "Fold": 100 }, "63o": { "Fold": 100 }, "62o": { "Fold": 100 }, "54o": { "Fold": 100 }, "53o": { "Fold": 100 }, "52o": { "Fold": 100 }, "43o": { "Fold": 100 }, "42o": { "Fold": 100 }, "32o": { "Fold": 100 }, "K9o": { "ALL-IN": 100 }, "K8o": { "Fold": 100 }, "K7o": { "Fold": 100 }, "K6o": { "Fold": 100 }, "K5o": { "Fold": 100 }, "K4o": { "Fold": 100 }, "K3o": { "Fold": 100 }, "K2o": { "Fold": 100 }, "A6o": { "ALL-IN": 100 }, "A5o": { "ALL-IN": 100 }, "A4o": { "ALL-IN": 100 }, "A3o": { "ALL-IN": 100 }, "A2o": { "Fold": 100 }
    },
    "customActions": ["Fold", "ALL-IN"],
    "heroBetSize": 2.5
  },
  {
    "id": "sc-1770420479096",
    "name": "OPEN SHOVE - 1bb",
    "description": "",
    "videoLink": "",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "OPEN SHOVE",
    "playerCount": 9,
    "heroPos": "LJ",
    "opponents": [],
    "stackBB": 1,
    "ranges": {
      "22": { "ALL-IN": 100 }, "33": { "ALL-IN": 100 }, "44": { "ALL-IN": 100 }, "55": { "ALL-IN": 100 }, "66": { "ALL-IN": 100 }, "77": { "ALL-IN": 100 }, "88": { "ALL-IN": 100 }, "99": { "ALL-IN": 100 }, "AA": { "ALL-IN": 100 }, "AKs": { "ALL-IN": 100 }, "AQs": { "ALL-IN": 100 }, "AJs": { "ALL-IN": 100 }, "ATs": { "ALL-IN": 100 }, "A9s": { "ALL-IN": 100 }, "A8s": { "ALL-IN": 100 }, "A7s": { "ALL-IN": 100 }, "A6s": { "ALL-IN": 100 }, "A5s": { "ALL-IN": 100 }, "A4s": { "ALL-IN": 100 }, "A3s": { "ALL-IN": 100 }, "A2s": { "ALL-IN": 100 }, "AKo": { "ALL-IN": 100 }, "KK": { "ALL-IN": 100 }, "KQs": { "ALL-IN": 100 }, "KJs": { "ALL-IN": 100 }, "KTs": { "ALL-IN": 100 }, "K9s": { "ALL-IN": 100 }, "K8s": { "ALL-IN": 100 }, "K7s": { "ALL-IN": 100 }, "K6s": { "ALL-IN": 100 }, "Q8s": { "ALL-IN": 100 }, "QTs": { "ALL-IN": 100 }, "Q9s": { "ALL-IN": 100 }, "T9s": { "ALL-IN": 100 }, "J9s": { "ALL-IN": 100 }, "JTs": { "ALL-IN": 100 }, "QJs": { "ALL-IN": 100 }, "QQ": { "ALL-IN": 100 }, "TT": { "ALL-IN": 100 }, "JJ": { "ALL-IN": 100 }, "T8s": { "ALL-IN": 100 }, "98s": { "ALL-IN": 100 }, "87s": { "ALL-IN": 100 }, "A7o": { "ALL-IN": 100 }, "A8o": { "ALL-IN": 100 }, "A9o": { "ALL-IN": 100 }, "ATo": { "ALL-IN": 100 }, "AJo": { "ALL-IN": 100 }, "AQo": { "ALL-IN": 100 }, "KQo": { "ALL-IN": 100 }, "KJo": { "ALL-IN": 100 }, "KTo": { "ALL-IN": 100 }, "QJo": { "ALL-IN": 100 }, "K5s": { "ALL-IN": 100 }, "K4s": { "ALL-IN": 100 }, "K3s": { "ALL-IN": 100 }, "K2s": { "Fold": 100 }, "Q7s": { "ALL-IN": 100 }, "Q6s": { "ALL-IN": 100 }, "Q5s": { "Fold": 100 }, "Q4s": { "Fold": 100 }, "Q3s": { "Fold": 100 }, "Q2s": { "Fold": 100 }, "J8s": { "ALL-IN": 100 }, "J7s": { "Fold": 100 }, "J6s": { "Fold": 100 }, "J5s": { "Fold": 100 }, "J4s": { "Fold": 100 }, "J3s": { "Fold": 100 }, "J2s": { "Fold": 100 }, "T7s": { "Fold": 100 }, "T6s": { "Fold": 100 }, "T5s": { "Fold": 100 }, "T4s": { "Fold": 100 }, "T3s": { "Fold": 100 }, "T2s": { "Fold": 100 }, "97s": { "ALL-IN": 100 }, "96s": { "Fold": 100 }, "95s": { "Fold": 100 }, "94s": { "Fold": 100 }, "93s": { "Fold": 100 }, "92s": { "Fold": 100 }, "86s": { "Fold": 100 }, "85s": { "Fold": 100 }, "84s": { "Fold": 100 }, "83s": { "Fold": 100 }, "82s": { "Fold": 100 }, "72s": { "Fold": 100 }, "73s": { "Fold": 100 }, "74s": { "Fold": 100 }, "75s": { "Fold": 100 }, "76s": { "Fold": 100 }, "65s": { "Fold": 100 }, "64s": { "Fold": 100 }, "63s": { "Fold": 100 }, "62s": { "Fold": 100 }, "54s": { "Fold": 100 }, "53s": { "Fold": 100 }, "52s": { "Fold": 100 }, "43s": { "Fold": 100 }, "42s": { "Fold": 100 }, "32s": { "Fold": 100 }, "QTo": { "ALL-IN": 100 }, "Q9o": { "ALL-IN": 100 }, "Q8o": { "Fold": 100 }, "Q7o": { "Fold": 100 }, "Q6o": { "Fold": 100 }, "Q5o": { "Fold": 100 }, "Q4o": { "Fold": 100 }, "Q3o": { "Fold": 100 }, "Q2o": { "Fold": 100 }, "J2o": { "Fold": 100 }, "J3o": { "Fold": 100 }, "J4o": { "Fold": 100 }, "J5o": { "Fold": 100 }, "J6o": { "Fold": 100 }, "J7o": { "Fold": 100 }, "J8o": { "Fold": 100 }, "J9o": { "Fold": 100 }, "JTo": { "ALL-IN": 100 }, "T9o": { "Fold": 100 }, "T8o": { "Fold": 100 }, "T7o": { "Fold": 100 }, "T6o": { "Fold": 100 }, "T5o": { "Fold": 100 }, "T4o": { "Fold": 100 }, "T3o": { "Fold": 100 }, "T2o": { "Fold": 100 }, "98o": { "Fold": 100 }, "97o": { "Fold": 100 }, "96o": { "Fold": 100 }, "95o": { "Fold": 100 }, "94o": { "Fold": 100 }, "93o": { "Fold": 100 }, "92o": { "Fold": 100 }, "87o": { "Fold": 100 }, "86o": { "Fold": 100 }, "85o": { "Fold": 100 }, "84o": { "Fold": 100 }, "83o": { "Fold": 100 }, "82o": { "Fold": 100 }, "76o": { "Fold": 100 }, "75o": { "Fold": 100 }, "74o": { "Fold": 100 }, "73o": { "Fold": 100 }, "72o": { "Fold": 100 }, "65o": { "Fold": 100 }, "64o": { "Fold": 100 }, "63o": { "Fold": 100 }, "62o": { "Fold": 100 }, "54o": { "Fold": 100 }, "53o": { "Fold": 100 }, "52o": { "Fold": 100 }, "43o": { "Fold": 100 }, "42o": { "Fold": 100 }, "32o": { "Fold": 100 }, "K9o": { "ALL-IN": 100 }, "K8o": { "Fold": 100 }, "K7o": { "Fold": 100 }, "K6o": { "Fold": 100 }, "K5o": { "Fold": 100 }, "K4o": { "Fold": 100 }, "K3o": { "Fold": 100 }, "K2o": { "Fold": 100 }, "A6o": { "ALL-IN": 100 }, "A5o": { "ALL-IN": 100 }, "A4o": { "ALL-IN": 100 }, "A3o": { "ALL-IN": 100 }, "A2o": { "ALL-IN": 100 }
    },
    "customActions": ["Fold", "ALL-IN"],
    "heroBetSize": 2.5
  },
  {
    "id": "sc-1770420523990",
    "name": "OPEN SHOVE - 1bb",
    "description": "",
    "videoLink": "",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "OPEN SHOVE",
    "playerCount": 9,
    "heroPos": "HJ",
    "opponents": [],
    "stackBB": 1,
    "ranges": {
      "22": { "ALL-IN": 100 }, "33": { "ALL-IN": 100 }, "44": { "ALL-IN": 100 }, "55": { "ALL-IN": 100 }, "66": { "ALL-IN": 100 }, "77": { "ALL-IN": 100 }, "88": { "ALL-IN": 100 }, "99": { "ALL-IN": 100 }, "AA": { "ALL-IN": 100 }, "AKs": { "ALL-IN": 100 }, "AQs": { "ALL-IN": 100 }, "AJs": { "ALL-IN": 100 }, "ATs": { "ALL-IN": 100 }, "A9s": { "ALL-IN": 100 }, "A8s": { "ALL-IN": 100 }, "A7s": { "ALL-IN": 100 }, "A6s": { "ALL-IN": 100 }, "A5s": { "ALL-IN": 100 }, "A4s": { "ALL-IN": 100 }, "A3s": { "ALL-IN": 100 }, "A2s": { "ALL-IN": 100 }, "AKo": { "ALL-IN": 100 }, "KK": { "ALL-IN": 100 }, "KQs": { "ALL-IN": 100 }, "KJs": { "ALL-IN": 100 }, "KTs": { "ALL-IN": 100 }, "K9s": { "ALL-IN": 100 }, "K8s": { "ALL-IN": 100 }, "K7s": { "ALL-IN": 100 }, "K6s": { "ALL-IN": 100 }, "Q8s": { "ALL-IN": 100 }, "QTs": { "ALL-IN": 100 }, "Q9s": { "ALL-IN": 100 }, "T9s": { "ALL-IN": 100 }, "J9s": { "ALL-IN": 100 }, "JTs": { "ALL-IN": 100 }, "QJs": { "ALL-IN": 100 }, "QQ": { "ALL-IN": 100 }, "TT": { "ALL-IN": 100 }, "JJ": { "ALL-IN": 100 }, "T8s": { "ALL-IN": 100 }, "98s": { "ALL-IN": 100 }, "87s": { "ALL-IN": 100 }, "A7o": { "ALL-IN": 100 }, "A8o": { "ALL-IN": 100 }, "A9o": { "ALL-IN": 100 }, "ATo": { "ALL-IN": 100 }, "AJo": { "ALL-IN": 100 }, "AQo": { "ALL-IN": 100 }, "KQo": { "ALL-IN": 100 }, "KJo": { "ALL-IN": 100 }, "KTo": { "ALL-IN": 100 }, "QJo": { "ALL-IN": 100 }, "K5s": { "ALL-IN": 100 }, "K4s": { "ALL-IN": 100 }, "K3s": { "ALL-IN": 100 }, "K2s": { "Fold": 100 }, "Q7s": { "ALL-IN": 100 }, "Q6s": { "ALL-IN": 100 }, "Q5s": { "ALL-IN": 100 }, "Q4s": { "Fold": 100 }, "Q3s": { "Fold": 100 }, "Q2s": { "Fold": 100 }, "J8s": { "ALL-IN": 100 }, "J7s": { "ALL-IN": 100 }, "J6s": { "Fold": 100 }, "J5s": { "Fold": 100 }, "J4s": { "Fold": 100 }, "J3s": { "Fold": 100 }, "J2s": { "Fold": 100 }, "T7s": { "ALL-IN": 100 }, "T6s": { "Fold": 100 }, "T5s": { "Fold": 100 }, "T4s": { "Fold": 100 }, "T3s": { "Fold": 100 }, "T2s": { "Fold": 100 }, "97s": { "ALL-IN": 100 }, "96s": { "Fold": 100 }, "95s": { "Fold": 100 }, "94s": { "Fold": 100 }, "93s": { "Fold": 100 }, "92s": { "Fold": 100 }, "86s": { "Fold": 100 }, "85s": { "Fold": 100 }, "84s": { "Fold": 100 }, "83s": { "Fold": 100 }, "82s": { "Fold": 100 }, "72s": { "Fold": 100 }, "73s": { "Fold": 100 }, "74s": { "Fold": 100 }, "75s": { "Fold": 100 }, "76s": { "ALL-IN": 100 }, "65s": { "Fold": 100 }, "64s": { "Fold": 100 }, "63s": { "Fold": 100 }, "62s": { "Fold": 100 }, "54s": { "Fold": 100 }, "53s": { "Fold": 100 }, "52s": { "Fold": 100 }, "43s": { "Fold": 100 }, "42s": { "Fold": 100 }, "32s": { "Fold": 100 }, "QTo": { "ALL-IN": 100 }, "Q9o": { "ALL-IN": 100 }, "Q8o": { "Fold": 100 }, "Q7o": { "Fold": 100 }, "Q6o": { "Fold": 100 }, "Q5o": { "Fold": 100 }, "Q4o": { "Fold": 100 }, "Q3o": { "Fold": 100 }, "Q2o": { "Fold": 100 }, "J2o": { "Fold": 100 }, "J3o": { "Fold": 100 }, "J4o": { "Fold": 100 }, "J5o": { "Fold": 100 }, "J6o": { "Fold": 100 }, "J7o": { "Fold": 100 }, "J8o": { "Fold": 100 }, "J9o": { "ALL-IN": 100 }, "JTo": { "ALL-IN": 100 }, "T9o": { "ALL-IN": 100 }, "T8o": { "Fold": 100 }, "T7o": { "Fold": 100 }, "T6o": { "Fold": 100 }, "T5o": { "Fold": 100 }, "T4o": { "Fold": 100 }, "T3o": { "Fold": 100 }, "T2o": { "Fold": 100 }, "98o": { "Fold": 100 }, "97o": { "Fold": 100 }, "96o": { "Fold": 100 }, "95o": { "Fold": 100 }, "94o": { "Fold": 100 }, "93o": { "Fold": 100 }, "92o": { "Fold": 100 }, "87o": { "Fold": 100 }, "86o": { "Fold": 100 }, "85o": { "Fold": 100 }, "84o": { "Fold": 100 }, "83o": { "Fold": 100 }, "82o": { "Fold": 100 }, "76o": { "Fold": 100 }, "75o": { "Fold": 100 }, "74o": { "Fold": 100 }, "73o": { "Fold": 100 }, "72o": { "Fold": 100 }, "65o": { "Fold": 100 }, "64o": { "Fold": 100 }, "63o": { "Fold": 100 }, "62o": { "Fold": 100 }, "54o": { "Fold": 100 }, "53o": { "Fold": 100 }, "52o": { "Fold": 100 }, "43o": { "Fold": 100 }, "42o": { "Fold": 100 }, "32o": { "Fold": 100 }, "K9o": { "ALL-IN": 100 }, "K8o": { "ALL-IN": 100 }, "K7o": { "ALL-IN": 100 }, "K6o": { "Fold": 100 }, "K5o": { "Fold": 100 }, "K4o": { "Fold": 100 }, "K3o": { "Fold": 100 }, "K2o": { "Fold": 100 }, "A6o": { "ALL-IN": 100 }, "A5o": { "ALL-IN": 100 }, "A4o": { "ALL-IN": 100 }, "A3o": { "ALL-IN": 100 }, "A2o": { "ALL-IN": 100 }
    },
    "customActions": ["Fold", "ALL-IN"],
    "heroBetSize": 2.5
  },
  {
    "id": "sc-1770420555472",
    "name": "OPEN SHOVE - 1bb",
    "description": "",
    "videoLink": "",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "OPEN SHOVE",
    "playerCount": 9,
    "heroPos": "CO",
    "opponents": [],
    "stackBB": 1,
    "ranges": {
      "22": { "ALL-IN": 100 }, "33": { "ALL-IN": 100 }, "44": { "ALL-IN": 100 }, "55": { "ALL-IN": 100 }, "66": { "ALL-IN": 100 }, "77": { "ALL-IN": 100 }, "88": { "ALL-IN": 100 }, "99": { "ALL-IN": 100 }, "AA": { "ALL-IN": 100 }, "AKs": { "ALL-IN": 100 }, "AQs": { "ALL-IN": 100 }, "AJs": { "ALL-IN": 100 }, "ATs": { "ALL-IN": 100 }, "A9s": { "ALL-IN": 100 }, "A8s": { "ALL-IN": 100 }, "A7s": { "ALL-IN": 100 }, "A6s": { "ALL-IN": 100 }, "A5s": { "ALL-IN": 100 }, "A4s": { "ALL-IN": 100 }, "A3s": { "ALL-IN": 100 }, "A2s": { "ALL-IN": 100 }, "AKo": { "ALL-IN": 100 }, "KK": { "ALL-IN": 100 }, "KQs": { "ALL-IN": 100 }, "KJs": { "ALL-IN": 100 }, "KTs": { "ALL-IN": 100 }, "K9s": { "ALL-IN": 100 }, "K8s": { "ALL-IN": 100 }, "K7s": { "ALL-IN": 100 }, "K6s": { "ALL-IN": 100 }, "Q8s": { "ALL-IN": 100 }, "QTs": { "ALL-IN": 100 }, "Q9s": { "ALL-IN": 100 }, "T9s": { "ALL-IN": 100 }, "J9s": { "ALL-IN": 100 }, "JTs": { "ALL-IN": 100 }, "QJs": { "ALL-IN": 100 }, "QQ": { "ALL-IN": 100 }, "TT": { "ALL-IN": 100 }, "JJ": { "ALL-IN": 100 }, "T8s": { "ALL-IN": 100 }, "98s": { "ALL-IN": 100 }, "87s": { "ALL-IN": 100 }, "A7o": { "ALL-IN": 100 }, "A8o": { "ALL-IN": 100 }, "A9o": { "ALL-IN": 100 }, "ATo": { "ALL-IN": 100 }, "AJo": { "ALL-IN": 100 }, "AQo": { "ALL-IN": 100 }, "KQo": { "ALL-IN": 100 }, "KJo": { "ALL-IN": 100 }, "KTo": { "ALL-IN": 100 }, "QJo": { "ALL-IN": 100 }, "K5s": { "ALL-IN": 100 }, "K4s": { "ALL-IN": 100 }, "K3s": { "ALL-IN": 100 }, "K2s": { "ALL-IN": 100 }, "Q7s": { "ALL-IN": 100 }, "Q6s": { "ALL-IN": 100 }, "Q5s": { "ALL-IN": 100 }, "Q4s": { "ALL-IN": 100 }, "Q3s": { "ALL-IN": 100 }, "Q2s": { "Fold": 100 }, "J8s": { "ALL-IN": 100 }, "J7s": { "ALL-IN": 100 }, "J6s": { "ALL-IN": 100 }, "J5s": { "Fold": 100 }, "J4s": { "Fold": 100 }, "J3s": { "Fold": 100 }, "J2s": { "Fold": 100 }, "T7s": { "ALL-IN": 100 }, "T6s": { "ALL-IN": 100 }, "T5s": { "Fold": 100 }, "T4s": { "Fold": 100 }, "T3s": { "Fold": 100 }, "T2s": { "Fold": 100 }, "97s": { "ALL-IN": 100 }, "96s": { "Fold": 100 }, "95s": { "Fold": 100 }, "94s": { "Fold": 100 }, "93s": { "Fold": 100 }, "92s": { "Fold": 100 }, "86s": { "ALL-IN": 100 }, "85s": { "Fold": 100 }, "84s": { "Fold": 100 }, "83s": { "Fold": 100 }, "82s": { "Fold": 100 }, "72s": { "Fold": 100 }, "73s": { "Fold": 100 }, "74s": { "Fold": 100 }, "75s": { "Fold": 100 }, "76s": { "ALL-IN": 100 }, "65s": { "Fold": 100 }, "64s": { "Fold": 100 }, "63s": { "Fold": 100 }, "62s": { "Fold": 100 }, "54s": { "Fold": 100 }, "53s": { "Fold": 100 }, "52s": { "Fold": 100 }, "43s": { "Fold": 100 }, "42s": { "Fold": 100 }, "32s": { "Fold": 100 }, "QTo": { "ALL-IN": 100 }, "Q9o": { "ALL-IN": 100 }, "Q8o": { "ALL-IN": 100 }, "Q7o": { "Fold": 100 }, "Q6o": { "Fold": 100 }, "Q5o": { "Fold": 100 }, "Q4o": { "Fold": 100 }, "Q3o": { "Fold": 100 }, "Q2o": { "Fold": 100 }, "J2o": { "Fold": 100 }, "J3o": { "Fold": 100 }, "J4o": { "Fold": 100 }, "J5o": { "Fold": 100 }, "J6o": { "Fold": 100 }, "J7o": { "Fold": 100 }, "J8o": { "ALL-IN": 100 }, "J9o": { "ALL-IN": 100 }, "JTo": { "ALL-IN": 100 }, "T9o": { "ALL-IN": 100 }, "T8o": { "Fold": 100 }, "T7o": { "Fold": 100 }, "T6o": { "Fold": 100 }, "T5o": { "Fold": 100 }, "T4o": { "Fold": 100 }, "T3o": { "Fold": 100 }, "T2o": { "Fold": 100 }, "98o": { "Fold": 100 }, "97o": { "Fold": 100 }, "96o": { "Fold": 100 }, "95o": { "Fold": 100 }, "94o": { "Fold": 100 }, "93o": { "Fold": 100 }, "92o": { "Fold": 100 }, "87o": { "Fold": 100 }, "86o": { "Fold": 100 }, "85o": { "Fold": 100 }, "84o": { "Fold": 100 }, "83o": { "Fold": 100 }, "82o": { "Fold": 100 }, "76o": { "Fold": 100 }, "75o": { "Fold": 100 }, "74o": { "Fold": 100 }, "73o": { "Fold": 100 }, "72o": { "Fold": 100 }, "65o": { "Fold": 100 }, "64o": { "Fold": 100 }, "63o": { "Fold": 100 }, "62o": { "Fold": 100 }, "54o": { "Fold": 100 }, "53o": { "Fold": 100 }, "52o": { "Fold": 100 }, "43o": { "Fold": 100 }, "42o": { "Fold": 100 }, "32o": { "Fold": 100 }, "K9o": { "ALL-IN": 100 }, "K8o": { "ALL-IN": 100 }, "K7o": { "ALL-IN": 100 }, "K6o": { "ALL-IN": 100 }, "K5o": { "ALL-IN": 100 }, "K3o": { "Fold": 100 }, "K2o": { "Fold": 100 }, "A6o": { "ALL-IN": 100 }, "A5o": { "ALL-IN": 100 }, "A4o": { "ALL-IN": 100 }, "A3o": { "ALL-IN": 100 }, "A2o": { "ALL-IN": 100 }
    },
    "customActions": ["Fold", "ALL-IN"],
    "heroBetSize": 2.5
  },
  {
    "id": "sc-1770420596322",
    "name": "OPEN SHOVE - 1bb",
    "description": "",
    "videoLink": "",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "OPEN SHOVE",
    "playerCount": 9,
    "heroPos": "BTN",
    "opponents": [],
    "stackBB": 1,
    "ranges": {
      "22": { "ALL-IN": 100 }, "33": { "ALL-IN": 100 }, "44": { "ALL-IN": 100 }, "55": { "ALL-IN": 100 }, "66": { "ALL-IN": 100 }, "77": { "ALL-IN": 100 }, "88": { "ALL-IN": 100 }, "99": { "ALL-IN": 100 }, "AA": { "ALL-IN": 100 }, "AKs": { "ALL-IN": 100 }, "AQs": { "ALL-IN": 100 }, "AJs": { "ALL-IN": 100 }, "ATs": { "ALL-IN": 100 }, "A9s": { "ALL-IN": 100 }, "A8s": { "ALL-IN": 100 }, "A7s": { "ALL-IN": 100 }, "A6s": { "ALL-IN": 100 }, "A5s": { "ALL-IN": 100 }, "A4s": { "ALL-IN": 100 }, "A3s": { "ALL-IN": 100 }, "A2s": { "ALL-IN": 100 }, "AKo": { "ALL-IN": 100 }, "KK": { "ALL-IN": 100 }, "KQs": { "ALL-IN": 100 }, "KJs": { "ALL-IN": 100 }, "KTs": { "ALL-IN": 100 }, "K9s": { "ALL-IN": 100 }, "K8s": { "ALL-IN": 100 }, "K7s": { "ALL-IN": 100 }, "K6s": { "ALL-IN": 100 }, "Q8s": { "ALL-IN": 100 }, "QTs": { "ALL-IN": 100 }, "Q9s": { "ALL-IN": 100 }, "T9s": { "ALL-IN": 100 }, "J9s": { "ALL-IN": 100 }, "JTs": { "ALL-IN": 100 }, "QJs": { "ALL-IN": 100 }, "QQ": { "ALL-IN": 100 }, "TT": { "ALL-IN": 100 }, "JJ": { "ALL-IN": 100 }, "T8s": { "ALL-IN": 100 }, "98s": { "ALL-IN": 100 }, "87s": { "ALL-IN": 100 }, "A7o": { "ALL-IN": 100 }, "A8o": { "ALL-IN": 100 }, "A9o": { "ALL-IN": 100 }, "ATo": { "ALL-IN": 100 }, "AJo": { "ALL-IN": 100 }, "AQo": { "ALL-IN": 100 }, "KQo": { "ALL-IN": 100 }, "KJo": { "ALL-IN": 100 }, "KTo": { "ALL-IN": 100 }, "QJo": { "ALL-IN": 100 }, "K5s": { "ALL-IN": 100 }, "K4s": { "ALL-IN": 100 }, "K3s": { "ALL-IN": 100 }, "K2s": { "ALL-IN": 100 }, "Q7s": { "ALL-IN": 100 }, "Q6s": { "ALL-IN": 100 }, "Q5s": { "ALL-IN": 100 }, "Q4s": { "ALL-IN": 100 }, "Q3s": { "ALL-IN": 100 }, "Q2s": { "ALL-IN": 100 }, "J8s": { "ALL-IN": 100 }, "J7s": { "ALL-IN": 100 }, "J6s": { "ALL-IN": 100 }, "J5s": { "ALL-IN": 100 }, "J4s": { "ALL-IN": 100 }, "J3s": { "Fold": 100 }, "J2s": { "Fold": 100 }, "T7s": { "ALL-IN": 100 }, "T6s": { "ALL-IN": 100 }, "T5s": { "Fold": 100 }, "T4s": { "Fold": 100 }, "T3s": { "Fold": 100 }, "T2s": { "Fold": 100 }, "97s": { "ALL-IN": 100 }, "96s": { "ALL-IN": 100 }, "95s": { "Fold": 100 }, "94s": { "Fold": 100 }, "93s": { "Fold": 100 }, "92s": { "Fold": 100 }, "86s": { "ALL-IN": 100 }, "85s": { "Fold": 100 }, "84s": { "Fold": 100 }, "83s": { "Fold": 100 }, "82s": { "Fold": 100 }, "72s": { "Fold": 100 }, "73s": { "Fold": 100 }, "74s": { "Fold": 100 }, "75s": { "Fold": 100 }, "76s": { "ALL-IN": 100 }, "65s": { "Fold": 100 }, "64s": { "Fold": 100 }, "63s": { "Fold": 100 }, "62s": { "Fold": 100 }, "54s": { "Fold": 100 }, "53s": { "Fold": 100 }, "52s": { "Fold": 100 }, "43s": { "Fold": 100 }, "42s": { "Fold": 100 }, "32s": { "Fold": 100 }, "QTo": { "ALL-IN": 100 }, "Q9o": { "ALL-IN": 100 }, "Q8o": { "ALL-IN": 100 }, "Q7o": { "ALL-IN": 100 }, "Q6o": { "ALL-IN": 100 }, "Q5o": { "ALL-IN": 100 }, "Q4o": { "Fold": 100 }, "Q3o": { "Fold": 100 }, "Q2o": { "Fold": 100 }, "J2o": { "Fold": 100 }, "J3o": { "Fold": 100 }, "J4o": { "Fold": 100 }, "J5o": { "Fold": 100 }, "J6o": { "Fold": 100 }, "J7o": { "ALL-IN": 100 }, "J8o": { "ALL-IN": 100 }, "J9o": { "ALL-IN": 100 }, "JTo": { "ALL-IN": 100 }, "T9o": { "ALL-IN": 100 }, "T8o": { "ALL-IN": 100 }, "T7o": { "Fold": 100 }, "T6o": { "Fold": 100 }, "T5o": { "Fold": 100 }, "T4o": { "Fold": 100 }, "T3o": { "Fold": 100 }, "T2o": { "Fold": 100 }, "98o": { "ALL-IN": 100 }, "97o": { "Fold": 100 }, "96o": { "Fold": 100 }, "95o": { "Fold": 100 }, "94o": { "Fold": 100 }, "93o": { "Fold": 100 }, "92o": { "Fold": 100 }, "87o": { "Fold": 100 }, "86o": { "Fold": 100 }, "85o": { "Fold": 100 }, "84o": { "Fold": 100 }, "83o": { "Fold": 100 }, "82o": { "Fold": 100 }, "76o": { "Fold": 100 }, "75o": { "Fold": 100 }, "74o": { "Fold": 100 }, "73o": { "Fold": 100 }, "72o": { "Fold": 100 }, "65o": { "Fold": 100 }, "64o": { "Fold": 100 }, "63o": { "Fold": 100 }, "62o": { "Fold": 100 }, "54o": { "Fold": 100 }, "53o": { "Fold": 100 }, "52o": { "Fold": 100 }, "43o": { "Fold": 100 }, "42o": { "Fold": 100 }, "32o": { "Fold": 100 }, "K9o": { "ALL-IN": 100 }, "K8o": { "ALL-IN": 100 }, "K7o": { "ALL-IN": 100 }, "K6o": { "ALL-IN": 100 }, "K5o": { "ALL-IN": 100 }, "K3o": { "ALL-IN": 100 }, "K2o": { "ALL-IN": 100 }, "A6o": { "ALL-IN": 100 }, "A5o": { "ALL-IN": 100 }, "A4o": { "ALL-IN": 100 }, "A3o": { "ALL-IN": 100 }, "A2o": { "ALL-IN": 100 }, "K4o": { "ALL-IN": 100 }
    },
    "customActions": ["Fold", "ALL-IN"],
    "heroBetSize": 2.5
  },
  {
    "id": "sc-1770420640832",
    "name": "OPEN SHOVE - 1bb",
    "description": "",
    "videoLink": "",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "OPEN SHOVE",
    "playerCount": 9,
    "heroPos": "SB",
    "opponents": [],
    "stackBB": 1,
    "ranges": {
      "22": { "ALL-IN": 100 }, "33": { "ALL-IN": 100 }, "44": { "ALL-IN": 100 }, "55": { "ALL-IN": 100 }, "66": { "ALL-IN": 100 }, "77": { "ALL-IN": 100 }, "88": { "ALL-IN": 100 }, "99": { "ALL-IN": 100 }, "AA": { "ALL-IN": 100 }, "AKs": { "ALL-IN": 100 }, "AQs": { "ALL-IN": 100 }, "AJs": { "ALL-IN": 100 }, "ATs": { "ALL-IN": 100 }, "A9s": { "ALL-IN": 100 }, "A8s": { "ALL-IN": 100 }, "A7s": { "ALL-IN": 100 }, "A6s": { "ALL-IN": 100 }, "A5s": { "ALL-IN": 100 }, "A4s": { "ALL-IN": 100 }, "A3s": { "ALL-IN": 100 }, "A2s": { "ALL-IN": 100 }, "AKo": { "ALL-IN": 100 }, "KK": { "ALL-IN": 100 }, "KQs": { "ALL-IN": 100 }, "KJs": { "ALL-IN": 100 }, "KTs": { "ALL-IN": 100 }, "K9s": { "ALL-IN": 100 }, "K8s": { "ALL-IN": 100 }, "K7s": { "ALL-IN": 100 }, "K6s": { "ALL-IN": 100 }, "Q8s": { "ALL-IN": 100 }, "QTs": { "ALL-IN": 100 }, "Q9s": { "ALL-IN": 100 }, "T9s": { "ALL-IN": 100 }, "J9s": { "ALL-IN": 100 }, "JTs": { "ALL-IN": 100 }, "QJs": { "ALL-IN": 100 }, "QQ": { "ALL-IN": 100 }, "TT": { "ALL-IN": 100 }, "JJ": { "ALL-IN": 100 }, "T8s": { "ALL-IN": 100 }, "98s": { "ALL-IN": 100 }, "87s": { "ALL-IN": 100 }, "A7o": { "ALL-IN": 100 }, "A8o": { "ALL-IN": 100 }, "A9o": { "ALL-IN": 100 }, "ATo": { "ALL-IN": 100 }, "AJo": { "ALL-IN": 100 }, "AQo": { "ALL-IN": 100 }, "KQo": { "ALL-IN": 100 }, "KJo": { "ALL-IN": 100 }, "KTo": { "ALL-IN": 100 }, "QJo": { "ALL-IN": 100 }, "K5s": { "ALL-IN": 100 }, "K4s": { "ALL-IN": 100 }, "K3s": { "ALL-IN": 100 }, "K2s": { "ALL-IN": 100 }, "Q7s": { "ALL-IN": 100 }, "Q6s": { "ALL-IN": 100 }, "Q5s": { "ALL-IN": 100 }, "Q4s": { "ALL-IN": 100 }, "Q3s": { "ALL-IN": 100 }, "Q2s": { "ALL-IN": 100 }, "J8s": { "ALL-IN": 100 }, "J7s": { "ALL-IN": 100 }, "J6s": { "ALL-IN": 100 }, "J5s": { "ALL-IN": 100 }, "J4s": { "ALL-IN": 100 }, "J3s": { "ALL-IN": 100 }, "J2s": { "ALL-IN": 100 }, "T7s": { "ALL-IN": 100 }, "T6s": { "ALL-IN": 100 }, "T5s": { "ALL-IN": 100 }, "T4s": { "ALL-IN": 100 }, "T3s": { "ALL-IN": 100 }, "T2s": { "ALL-IN": 100 }, "97s": { "ALL-IN": 100 }, "96s": { "ALL-IN": 100 }, "95s": { "ALL-IN": 100 }, "94s": { "ALL-IN": 100 }, "93s": { "ALL-IN": 100 }, "92s": { "ALL-IN": 100 }, "86s": { "ALL-IN": 100 }, "85s": { "ALL-IN": 100 }, "84s": { "ALL-IN": 100 }, "83s": { "ALL-IN": 100 }, "82s": { "ALL-IN": 100 }, "72s": { "Fold": 100 }, "73s": { "ALL-IN": 100 }, "74s": { "ALL-IN": 100 }, "75s": { "ALL-IN": 100 }, "76s": { "ALL-IN": 100 }, "65s": { "ALL-IN": 100 }, "64s": { "ALL-IN": 100 }, "63s": { "ALL-IN": 100 }, "62s": { "Fold": 100 }, "54s": { "ALL-IN": 100 }, "53s": { "ALL-IN": 100 }, "52s": { "Fold": 100 }, "43s": { "ALL-IN": 100 }, "42s": { "Fold": 100 }, "32s": { "Fold": 100 }, "QTo": { "ALL-IN": 100 }, "Q9o": { "ALL-IN": 100 }, "Q8o": { "ALL-IN": 100 }, "Q7o": { "ALL-IN": 100 }, "Q6o": { "ALL-IN": 100 }, "Q5o": { "ALL-IN": 100 }, "Q4o": { "Fold": 100 }, "Q3o": { "Fold": 100 }, "Q2o": { "Fold": 100 }, "J2o": { "Fold": 100 }, "J3o": { "Fold": 100 }, "J4o": { "Fold": 100 }, "J5o": { "Fold": 100 }, "J6o": { "Fold": 100 }, "J7o": { "ALL-IN": 100 }, "J8o": { "ALL-IN": 100 }, "J9o": { "ALL-IN": 100 }, "JTo": { "ALL-IN": 100 }, "T9o": { "ALL-IN": 100 }, "T8o": { "ALL-IN": 100 }, "T7o": { "Fold": 100 }, "T6o": { "Fold": 100 }, "T5o": { "Fold": 100 }, "T4o": { "Fold": 100 }, "T3o": { "Fold": 100 }, "T2o": { "Fold": 100 }, "98o": { "ALL-IN": 100 }, "97o": { "Fold": 100 }, "96o": { "Fold": 100 }, "95o": { "Fold": 100 }, "94o": { "Fold": 100 }, "93o": { "Fold": 100 }, "92o": { "Fold": 100 }, "87o": { "Fold": 100 }, "86o": { "Fold": 100 }, "85o": { "Fold": 100 }, "84o": { "Fold": 100 }, "83o": { "Fold": 100 }, "82o": { "Fold": 100 }, "76o": { "Fold": 100 }, "75o": { "Fold": 100 }, "74o": { "Fold": 100 }, "73o": { "Fold": 100 }, "72o": { "Fold": 100 }, "65o": { "Fold": 100 }, "64o": { "Fold": 100 }, "63o": { "Fold": 100 }, "62o": { "Fold": 100 }, "54o": { "Fold": 100 }, "53o": { "Fold": 100 }, "52o": { "Fold": 100 }, "43o": { "Fold": 100 }, "42o": { "Fold": 100 }, "32o": { "Fold": 100 }, "K9o": { "ALL-IN": 100 }, "K8o": { "ALL-IN": 100 }, "K7o": { "ALL-IN": 100 }, "K6o": { "ALL-IN": 100 }, "K5o": { "ALL-IN": 100 }, "K3o": { "ALL-IN": 100 }, "K2o": { "ALL-IN": 100 }, "A6o": { "ALL-IN": 100 }, "A5o": { "ALL-IN": 100 }, "A4o": { "ALL-IN": 100 }, "A3o": { "ALL-IN": 100 }, "A2o": { "ALL-IN": 100 }, "K4o": { "ALL-IN": 100 }
    },
    "customActions": ["Fold", "ALL-IN"],
    "heroBetSize": 2.5
  }
];

const SupportButton = () => (
  <div className="fixed bottom-8 right-8 z-[999] group">
    <div className="absolute bottom-full right-0 mb-4 opacity-0 group-hover:opacity-100 transition-all pointer-events-none translate-y-2 group-hover:translate-y-0">
      <div className="bg-[#1a1a1a] text-white text-[10px] font-black uppercase tracking-widest py-2 px-4 rounded-xl border border-white/10 shadow-2xl whitespace-nowrap">
        Suporte WhatsApp
      </div>
      <div className="w-2 h-2 bg-[#1a1a1a] border-r border-b border-white/10 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1"></div>
    </div>
    <a
      href="https://wa.me/5521990970439?text=Oi%2C%20vim%20da%20plataforma%20Pent%C3%A1gono%20e%20preciso%20de%20ajuda."
      target="_blank"
      rel="noopener noreferrer"
      className="w-12 h-12 bg-[#10b981] hover:bg-[#059669] text-white rounded-full shadow-[0_10px_30px_rgba(16,185,129,0.4)] transition-all hover:scale-110 active:scale-95 flex items-center justify-center border border-white/20"
      aria-label="Suporte via WhatsApp"
    >
      <span className="text-2xl font-black leading-none mt-[-2px]">?</span>
    </a>
  </div>
);

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [multiLoginError, setMultiLoginError] = useState(false);

  const [currentView, setCurrentView] = useState<'selection' | 'setup' | 'trainer'>('selection');
  
  useEffect(() => {
    const savedMembers = JSON.parse(localStorage.getItem(MEMBERS_STORAGE_KEY) || '[]');
    const memberMap = new Map<string, any>();
    SYSTEM_DEFAULT_MEMBERS.forEach(m => memberMap.set(m.email.toLowerCase(), m));
    savedMembers.forEach((m: any) => memberMap.set(m.email.toLowerCase(), m));
    localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(Array.from(memberMap.values())));
  }, []);

  const [scenarios, setScenarios] = useState<Scenario[]>(() => {
    const savedJson = localStorage.getItem(SCENARIOS_STORAGE_KEY);
    let savedScenarios: Scenario[] = [];
    if (savedJson) { try { savedScenarios = JSON.parse(savedJson); } catch (e) {} }
    const scenarioMap = new Map<string, Scenario>();
    SYSTEM_DEFAULT_SCENARIOS.forEach(s => scenarioMap.set(s.id, s));
    savedScenarios.forEach(s => scenarioMap.set(s.id, s));
    return Array.from(scenarioMap.values());
  });

  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [trainingGoal, setTrainingGoal] = useState<TrainingGoal | null>(null);
  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState(0);

  const [players, setPlayers] = useState<Player[]>([]);
  const [board, setBoard] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarPinned, setSidebarPinned] = useState(() => localStorage.getItem('gto_sidebar_pinned') === 'true');
  const [isFocusMode, setIsFocusMode] = useState(false);
  
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'incorrect' | 'timeout'>('idle');
  const [currentPot, setCurrentPot] = useState(0);
  
  const [handHistory, setHandHistory] = useState<HandRecord[]>([]);
  const [showStopModal, setShowStopModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [showSpotInfoModal, setShowSpotInfoModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showScenarioCreatorModal, setShowScenarioCreatorModal] = useState(false);
  const [showAdminMemberModal, setShowAdminMemberModal] = useState(false);

  const [timeBankSetting, setTimeBankSetting] = useState<TimeBankOption>('OFF');
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const timerRef = useRef<number | null>(null);
  const sessionTimerRef = useRef<number | null>(null);

  const isAdmin = currentUser === 'gabrielfmacedo@ymail.com';

  useEffect(() => {
    if (currentView === 'trainer' && !showReportModal && !showStopModal) {
      sessionTimerRef.current = window.setInterval(() => setSessionElapsedSeconds(prev => prev + 1), 1000);
    } else {
      if (sessionTimerRef.current) { clearInterval(sessionTimerRef.current); sessionTimerRef.current = null; }
    }
    return () => { if (sessionTimerRef.current) clearInterval(sessionTimerRef.current); };
  }, [currentView, showReportModal, showStopModal]);

  useEffect(() => {
    if (!trainingGoal || currentView !== 'trainer' || showReportModal) return;
    if (trainingGoal.type === 'hands' && handHistory.length >= trainingGoal.value) setShowReportModal(true);
    else if (trainingGoal.type === 'time' && sessionElapsedSeconds >= trainingGoal.value * 60) setShowReportModal(true);
  }, [handHistory.length, sessionElapsedSeconds, trainingGoal, currentView, showReportModal]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    const checkSession = () => {
      const activeSessions = JSON.parse(localStorage.getItem('gto_active_sessions') || '{}');
      const currentSessionId = sessionStorage.getItem('gto_current_session_id');
      const latestSessionId = activeSessions[currentUser.toLowerCase()];
      if (latestSessionId && latestSessionId !== currentSessionId) { handleLogout(); setMultiLoginError(true); }
    };
    const interval = setInterval(checkSession, 3000);
    window.addEventListener('focus', checkSession);
    window.addEventListener('storage', checkSession);
    return () => { clearInterval(interval); window.removeEventListener('focus', checkSession); window.removeEventListener('storage', checkSession); };
  }, [isAuthenticated, currentUser]);

  useEffect(() => {
    const session = localStorage.getItem('gto_session');
    if (session) {
      const { email, expiry, sessionId } = JSON.parse(session);
      if (Date.now() < expiry) {
        setCurrentUser(email);
        sessionStorage.setItem('gto_current_session_id', sessionId);
        setIsAuthenticated(true);
      } else localStorage.removeItem('gto_session');
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const mobile = width < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
        setIsFocusMode(false);
      } else if (sidebarPinned && !isFocusMode) {
        setSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarPinned, isFocusMode]);

  const handleToggleSidebarPin = () => {
    const newVal = !sidebarPinned;
    setSidebarPinned(newVal);
    localStorage.setItem('gto_sidebar_pinned', String(newVal));
    if (newVal) setSidebarOpen(true);
  };

  const resetToNewHand = useCallback(() => {
    if (!activeScenario) return;

    const activeHands = getActiveHandsFromRange(activeScenario.ranges);
    if (activeHands.length === 0) {
      alert("Erro: Este cenário não possui nenhuma mão configurada na matriz estratégica!");
      setCurrentView('selection');
      return;
    }

    const randomHandKey = activeHands[Math.floor(Math.random() * activeHands.length)];
    const heroCards = generateCardsFromKey(randomHandKey);

    const count = activeScenario.playerCount;
    const tablePositions = getTablePositions(count);
    const preflopOrder = getPreflopOrder(count);

    setBoard(activeScenario.street !== 'PREFLOP' ? ['Ah', 'Kh', 'Qh'] : []);

    let totalPot = 0;
    const heroOrderIndex = preflopOrder.indexOf(activeScenario.heroPos);

    const isIsoAction = activeScenario.preflopAction.toLowerCase() === 'iso';
    const opponentBetVal = activeScenario.opponentBetSize || 0;
    
    const scenarioPlayers: Player[] = tablePositions.map((posName, i) => {
      const isHero = posName === activeScenario.heroPos;
      const isOpponent = activeScenario.opponents.includes(posName);
      const orderIndex = preflopOrder.indexOf(posName);
      
      let status = PlayerStatus.IDLE;
      let betAmount = 0;
      let hasCards = false;

      if (isIsoAction && isOpponent) {
        betAmount = BIG_BLIND_VALUE;
        status = PlayerStatus.IDLE;
        hasCards = true;
      } 
      else if (!isIsoAction && isOpponent && activeScenario.opponents[0] === posName && opponentBetVal > 0) {
        betAmount = opponentBetVal * BIG_BLIND_VALUE;
        status = PlayerStatus.IDLE;
        hasCards = true;
      }
      
      if (orderIndex < heroOrderIndex && orderIndex !== -1) {
        if (!isOpponent) status = PlayerStatus.FOLDED;
      } else if (isHero) {
        status = PlayerStatus.ACTING;
        hasCards = true;
      } else if (orderIndex > heroOrderIndex) {
        hasCards = true;
      }

      if (posName === 'SB') { betAmount = Math.max(betAmount, BIG_BLIND_VALUE / 2); }
      else if (posName === 'BB') { betAmount = Math.max(betAmount, BIG_BLIND_VALUE); }

      totalPot += betAmount;

      const isDealer = count === 2 ? posName === 'SB' : posName === 'BTN';

      // Lógica de stack individual ou global
      const playerStackBB = activeScenario.individualStacks?.[posName] ?? activeScenario.stackBB;

      return {
        id: i + 1,
        name: `PLAYER_${i + 1}`,
        chips: (Number(playerStackBB) * Number(BIG_BLIND_VALUE)) - Number(betAmount),
        positionName: posName,
        status: status,
        betAmount: betAmount,
        cards: isHero ? heroCards : (hasCards ? ['BACK', 'BACK'] : undefined),
        isDealer: isDealer
      };
    });

    setPlayers(scenarioPlayers);
    setCurrentPot(totalPot);
    setFeedback('idle');
    if (timeBankSetting !== 'OFF') setTimeRemaining(timeBankSetting as number);
    else setTimeRemaining(0);
  }, [timeBankSetting, activeScenario]);

  useEffect(() => {
    if (isAuthenticated && currentView === 'trainer' && activeScenario) resetToNewHand();
  }, [isAuthenticated, currentView, activeScenario, resetToNewHand]);

  const handleActionClick = useCallback((label: string, isTimeout: boolean = false) => {
    if (feedback !== 'idle' && !isTimeout) return;
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }

    const heroIndex = players.findIndex(p => p.positionName === activeScenario?.heroPos);
    const hero = players[heroIndex];
    if (!hero || !activeScenario) return;

    const [c1, c2] = hero.cards!;
    const r1 = c1[0]; const s1 = c1[1]; const r2 = c2[0]; const s2 = c2[1];
    const rank1Idx = RANKS.indexOf(r1); const rank2Idx = RANKS.indexOf(r2);
    
    let comboKey = r1 + s1 + r2 + s2;
    let handKey = '';
    if (rank1Idx === rank2Idx) handKey = r1 + r2;
    else if (rank1Idx > rank2Idx) handKey = r1 + r2 + (s1 === s2 ? 's' : 'o');
    else handKey = r2 + r1 + (s1 === s2 ? 's' : 'o');

    const ranges = activeScenario.ranges;
    const labelLower = label.toLowerCase();
    const actionMap = ranges[comboKey] || ranges[handKey];
    
    let isCorrect = false;
    let correctAction = 'Fold';

    if (actionMap) {
      const baseAction = labelLower.includes('raise') || labelLower.includes('iso') ? 'Raise' : labelLower.includes('call') || labelLower.includes('check') ? 'Call' : label;
      const freq = actionMap[label] || actionMap[baseAction] || 0;
      isCorrect = (freq as number) > 0;
      
      const entries = Object.entries(actionMap);
      const sortedEntries = entries.sort((a, b) => (b[1] as number) - (a[1] as number));
      const bestAction = sortedEntries[0];
      if (bestAction) correctAction = bestAction[0];
    } else {
      isCorrect = labelLower.includes('fold');
    }

    if (!isTimeout) {
      setPlayers(prev => {
        const next = [...prev];
        const playerToUpdate = next[heroIndex];
        if (!playerToUpdate || !activeScenario) return prev;
        const p = { ...playerToUpdate };
        
        const isBettingAction = labelLower.includes('raise') || 
                                labelLower.includes('all-in') || 
                                labelLower.includes('shove') || 
                                labelLower.includes('rfi') || 
                                labelLower.includes('bet') ||
                                labelLower.includes('call') ||
                                labelLower.includes('iso') ||
                                labelLower.includes('check') ||
                                labelLower.includes('pagar');

        if (isBettingAction && !labelLower.includes('check')) {
          let betAmountBB: number = 0;
          
          if (labelLower.includes('call') || labelLower.includes('pagar')) {
            betAmountBB = Number(activeScenario.opponentBetSize || 1);
          } else if (labelLower.includes('all-in') || labelLower.includes('shove')) {
            betAmountBB = (Number(p.chips) + Number(p.betAmount)) / BIG_BLIND_VALUE;
          } else {
            const match = label.match(/(\d+\.?\d*)/);
            betAmountBB = match ? parseFloat(match[0]) : Number(activeScenario.heroBetSize);
          }
          
          const currentChipsVal = Number(p.chips || 0);
          const currentBetVal = Number(p.betAmount || 0);
          const bbVal = Number(BIG_BLIND_VALUE);
          
          let totalBetRaw = betAmountBB * bbVal;
          const additionalBetVal = totalBetRaw - currentBetVal;
          
          p.chips = currentChipsVal - additionalBetVal;
          p.betAmount = totalBetRaw;
          setCurrentPot(curr => Number(curr) + additionalBetVal);
        }
        
        p.status = labelLower.includes('fold') ? PlayerStatus.FOLDED : PlayerStatus.IDLE;
        next[heroIndex] = p;
        return next;
      });
    }

    const status = isCorrect ? 'correct' : 'incorrect';
    setFeedback(isTimeout ? 'timeout' : status);

    const newHand: HandRecord = {
      id: Date.now(),
      cards: hero.cards?.join(' ') || '??',
      action: isTimeout ? 'TEMPO ESGOTADO' : label,
      correctAction: correctAction,
      status: status,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isTimeout: isTimeout
    };
    setHandHistory(prev => [...prev, newHand]);
    setTimeout(() => resetToNewHand(), 1500);
  }, [players, feedback, resetToNewHand, activeScenario]);

  useEffect(() => {
    if (timeBankSetting === 'OFF' || feedback !== 'idle' || timeRemaining <= 0) {
      if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }
    timerRef.current = window.setInterval(() => {
      setTimeRemaining(prev => {
        const next = prev - 0.1;
        if (next <= 0) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          handleActionClick('Fold', true);
          return 0;
        }
        return next;
      });
    }, 100);
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [timeBankSetting, feedback, timeRemaining, handleActionClick]);

  const handleLogin = (email: string, remember: boolean) => {
    const sessionId = sessionStorage.getItem('gto_current_session_id') || Date.now().toString();
    const baseExpiry = 24 * 60 * 60 * 1000;
    const expiryTime = remember ? (7 * 24 * 60 * 60 * 1000) : baseExpiry;
    
    localStorage.setItem('gto_session', JSON.stringify({ 
      email, 
      sessionId, 
      expiry: Date.now() + expiryTime 
    }));
    
    setMultiLoginError(false); 
    setCurrentUser(email); 
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('gto_session');
    sessionStorage.removeItem('gto_current_session_id');
    setIsAuthenticated(false); setCurrentUser(null); setCurrentView('selection'); setAuthView('login');
  };

  const onSelectScenario = (s: Scenario) => { setActiveScenario(s); setCurrentView('setup'); setHandHistory([]); setSessionElapsedSeconds(0); };
  const handleStartTraining = (goal: TrainingGoal) => { setTrainingGoal(goal); setCurrentView('trainer'); setHandHistory([]); setSessionElapsedSeconds(0); };
  const handleCreateNew = () => setShowScenarioCreatorModal(true);
  
  const handleSaveScenario = (newScenario: Scenario) => {
    setScenarios(prev => {
      let updated;
      const index = prev.findIndex(s => s.id === newScenario.id);
      if (index !== -1) { 
        updated = [...prev]; 
        updated[index] = newScenario; 
      } else {
        updated = [...prev, newScenario];
      }
      const customScenarios = updated.filter(s => !SYSTEM_DEFAULT_SCENARIOS.some(def => def.id === s.id));
      localStorage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify(customScenarios));
      return updated;
    });
    setShowScenarioCreatorModal(false);
  };

  const handleDeleteScenario = (id: string) => {
    if (SYSTEM_DEFAULT_SCENARIOS.some(s => s.id === id)) {
      alert("Não é possível excluir cenários padrão do sistema.");
      return;
    }
    setScenarios(prev => {
      const updated = prev.filter(s => s.id !== id);
      const customScenarios = updated.filter(s => !SYSTEM_DEFAULT_SCENARIOS.some(def => def.id === s.id));
      localStorage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify(customScenarios));
      return updated;
    });
  };

  const handleStopTrainingConfirm = () => { setShowStopModal(false); setShowReportModal(true); setIsFocusMode(false); };
  const onExitToSelection = () => { setShowReportModal(false); setCurrentView('selection'); setTrainingGoal(null); setIsFocusMode(false); };

  const handleRestartConfirm = () => {
    setHandHistory([]);
    setSessionElapsedSeconds(0);
    setShowRestartModal(false);
    resetToNewHand();
  };

  const getDesktopPlayerStyle = (index: number, totalSlots: number) => {
    const startAngle = 270; const angleStep = 360 / totalSlots; const angleInDegrees = startAngle - (index * angleStep);
    let rx = 44; let ry = 38; const angleInRadians = (angleInDegrees * Math.PI) / 180;
    let x = 50 + rx * Math.cos(angleInRadians); let y = 50 - ry * Math.sin(angleInRadians);
    if (index === 0) y = 82;
    if (totalSlots === 9) {
      if (index === 1 || index === 8) y = 83;
      if (index === 3) { y -= 6; x -= 1; } if (index === 4 || index === 5) y -= 2; if (index === 6) { y -= 6; x += 1; }
    } else if (totalSlots === 6) {
       rx = 42; ry = 36; x = 50 + rx * Math.cos(angleInRadians); y = 50 - ry * Math.sin(angleInRadians);
       if (index === 0) y = 82; if (index === 1) { x -= 2; y += 1; } if (index === 2) { x -= 2; y -= 1; } if (index === 3) y -= 2; if (index === 4) { x += 2; y -= 1; } if (index === 5) { x += 2; y += 1; }
    } else if (totalSlots === 4) {
       rx = 42; ry = 36; x = 50 + rx * Math.cos(angleInRadians); y = 50 - ry * Math.sin(angleInRadians);
       if (index === 0) y = 82; if (index === 2) y = 10;
    } else if (totalSlots === 2) { if (index === 0) { x = 50; y = 82; } if (index === 1) { x = 50; y = 10; } }
    return { top: `${y}%`, left: `${x}%`, transform: 'translate(-50%, -50%)' };
  };

  const getMobilePlayerStyle = (index: number, totalSlots: number) => {
    const startAngle = 270; const angleStep = 360 / totalSlots; const angleInDegrees = startAngle - (index * angleStep);
    let rx = 37; let ry = 43; const angleInRadians = (angleInDegrees * Math.PI) / 180;
    let x = 50 + rx * Math.cos(angleInRadians); let y = 50 - ry * Math.sin(angleInRadians);
    if (index === 0) y = 88; 
    if (totalSlots === 9) {
      if (index === 1) { x -= 10; y -= 7; } else if (index === 8) { x += 10; y -= 7; } else if (index === 2 || index === 7) y -= 4; else if (index === 3) { x = 14; y -= 2; } else if (index === 6) { x = 86; y -= 2; } else if (index === 4) { x -= 4; y = 10; } else if (index === 5) { x += 4; y = 10; }
    } else if (totalSlots === 6) {
        rx = 35; ry = 42; x = 50 + rx * Math.cos(angleInRadians); y = 50 - ry * Math.sin(angleInRadians);
        if (index === 0) y = 88; if (index === 1) { x = 15; y = 68; } if (index === 2) { x = 15; y = 30; } if (index === 3) y = 10; if (index === 4) { x = 85; y = 30; } if (index === 5) { x = 85; y = 68; }
    } else if (totalSlots === 4) {
        rx = 34; ry = 42; x = 50 + rx * Math.cos(angleInRadians); y = 50 - ry * Math.sin(angleInRadians);
        if (index === 0) y = 88; if (index === 2) y = 1; if (index === 1) { x = 14; y = 49; } if (index === 3) { x = 86; y = 49; }
    } else if (totalSlots === 2) { if (index === 0) { x = 50; y = 88; } if (index === 1) { x = 50; y = 1; } }
    return { top: `${y}%`, left: `${x}%`, transform: 'translate(-50%, -50%)' };
  };

  const getOrientationClass = (index: number, isMobileMode: boolean, totalSlots: number) => {
    if (index === 0) return 'bottom';
    if (totalSlots === 9) {
        if (isMobileMode) {
          if (index >= 1 && index <= 3) return 'left'; if (index >= 4 && index <= 5) return 'top'; return 'right';
        } else {
          if (index > 0 && index <= 2) return 'left'; if (index >= 3 && index <= 6) return 'top'; return 'right';
        }
    } else if (totalSlots === 6) { if (index === 1 || index === 2) return 'left'; if (index === 3) return 'top'; if (index === 4 || index === 5) return 'right'; return 'top'; }
    else if (totalSlots === 2) return index === 0 ? 'bottom' : 'top';
    else { if (index === 1) return 'left'; if (index === 2) return 'top'; if (index === 3) return 'right'; return 'bottom'; }
  };

  const renderActionButtons = () => {
    const customActions = activeScenario?.customActions || ['Fold', 'Call', 'Raise', 'All-In'];
    const n = customActions.length;
    
    let row1: string[] = [];
    let row2: string[] = [];

    if (n <= 3) {
      row1 = customActions;
    } else if (n === 4) {
      row1 = customActions.slice(0, 2);
      row2 = customActions.slice(2, 4);
    } else if (n === 5) {
      row1 = customActions.slice(0, 3);
      row2 = customActions.slice(3, 5);
    } else {
      row1 = customActions.slice(0, 3);
      row2 = customActions.slice(3, 6);
    }

    const renderRow = (row: string[]) => (
      <div className="flex gap-2 w-full justify-center">
        {row.map((label) => {
          const originalIdx = customActions.indexOf(label);
          const color = getActionColor(label, originalIdx);
          const baseWidth = (n === 4) ? 'w-[calc(50%-4px)]' : 'w-[calc(33.33%-6px)]';
          
          return (
            <button key={originalIdx} onClick={() => handleActionClick(label)} 
              style={{ backgroundColor: color, borderColor: 'rgba(255,255,255,0.2)' }}
              className={`${baseWidth} h-8 md:h-10 px-1 rounded-lg border flex items-center justify-center transition-all active:scale-95 text-[9px] md:text-[10px] font-black uppercase tracking-wider text-white shadow-2xl hover:brightness-110 truncate`}>
              {label}
            </button>
          );
        })}
      </div>
    );

    return (
      <div className={`flex flex-col gap-1.5 md:gap-2 w-full ${isMobile ? 'max-w-[340px]' : 'max-w-[440px]'} px-2 items-center`}>
        {renderRow(row1)}
        {row2.length > 0 && renderRow(row2)}
      </div>
    );
  };

  const formatTime = (seconds: number) => { const mins = Math.floor(seconds / 60); const secs = seconds % 60; return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`; };
  const getProgressText = () => {
    if (!trainingGoal) return `${handHistory.length} mãos`;
    if (trainingGoal.type === 'hands') return `${handHistory.length} / ${trainingGoal.value} mãos`;
    if (trainingGoal.type === 'time') return `${formatTime(sessionElapsedSeconds)} / ${formatTime(trainingGoal.value * 60)}`;
    return `${handHistory.length} mãos`;
  };

  if (!isAuthenticated) {
    if (authView === 'login') {
      return <LoginScreen onLogin={handleLogin} onGoToRegister={() => setAuthView('register')} />;
    }
    return (
      <>
        <RegisterScreen onRegister={(e) => handleLogin(e, false)} onGoToLogin={() => setAuthView('login')} />
        <SupportButton />
      </>
    );
  }

  if (currentView === 'selection') return ( <div className="w-full h-screen overflow-hidden"> <SelectionScreen scenarios={scenarios} onSelect={onSelectScenario} onCreateNew={handleCreateNew} isAdmin={isAdmin} /> <ScenarioCreatorModal isOpen={showScenarioCreatorModal} scenarios={scenarios} onClose={() => setShowScenarioCreatorModal(false)} onSave={handleSaveScenario} onDelete={handleDeleteScenario} /> <AdminMemberModal isOpen={showAdminMemberModal} onClose={() => setShowAdminMemberModal(false)} /> <div className="fixed top-8 right-8 flex gap-3 z-[100]"> {isAdmin && ( <button onClick={() => setShowAdminMemberModal(true)} className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-all"> ADMIN </button> )} <button onClick={handleLogout} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all"> Sair </button> </div> <SupportButton /> </div> );
  if (currentView === 'setup' && activeScenario) return <> <TrainingSetupScreen scenarioName={activeScenario.name} onStart={handleStartTraining} onBack={() => setCurrentView('selection')} /> <SupportButton /> </>;

  const playerCount = activeScenario?.playerCount || 9;

  return (
    <div className="w-full h-screen bg-[#050505] flex overflow-hidden font-sans text-white relative">
      {!isFocusMode && (
        <Sidebar isOpen={sidebarOpen} isPinned={sidebarPinned} onToggle={() => setSidebarOpen(!sidebarOpen)} onTogglePin={handleToggleSidebarPin} onToggleFocusMode={() => setIsFocusMode(true)} onStopTreino={() => setShowStopModal(true)} onRestartTreino={() => setShowRestartModal(true)} onShowSpotInfo={() => setShowSpotInfoModal(true)} onShowConfig={() => setShowConfigModal(true)} onShowScenarioCreator={() => setShowScenarioCreatorModal(true)} onShowAdminMember={() => setShowAdminMemberModal(true)} onBackToSelection={() => setCurrentView('selection')} onLogout={handleLogout} currentUser={currentUser} history={handHistory} ranges={activeScenario?.ranges} customActions={activeScenario?.customActions} trainingGoal={trainingGoal || undefined} sessionElapsedSeconds={sessionElapsedSeconds} />
      )}
      {isFocusMode && (
        <div className="fixed inset-0 z-[200] pointer-events-none flex flex-col justify-between p-10 animate-in fade-in duration-500">
           <div className="flex justify-between items-start w-full pointer-events-auto">
              <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-[24px] px-8 py-4 shadow-2xl flex flex-col items-center">
                 <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">Status do Treino</span>
                 <span className="text-white font-mono font-black text-xl tracking-tight uppercase">{getProgressText()}</span>
              </div>
              <div className="flex gap-4">
                 <button onClick={() => setIsFocusMode(false)} className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[20px] text-[11px] font-black uppercase tracking-widest text-white shadow-2xl transition-all"> Sair do Modo Foco </button>
                 <button onClick={() => setShowStopModal(true)} className="px-8 py-4 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 rounded-[20px] text-[11px] font-black uppercase tracking-widest text-red-400 shadow-2xl transition-all"> Parar Treino </button>
              </div>
           </div>
        </div>
      )}
      <div className={`flex-1 relative flex flex-col items-center justify-center transition-all duration-300 ${!isMobile && sidebarOpen && !isFocusMode ? 'ml-80' : 'ml-0'}`}>
        <div className={`relative w-full ${isMobile ? 'max-w-[450px] aspect-[9/13.5] mt-[-40px]' : 'max-w-[800px] aspect-[16/10]'} flex flex-col items-center justify-center select-none transition-all duration-500`}>
          <div className={`absolute inset-0 ${isMobile ? 'm-8 rounded-[110px]' : 'm-16 rounded-[120px]'} border-[8px] border-[#111111] shadow-[0_20px_60px_-15px_rgba(0,0,0,1)] bg-[#080808]`}>
            {/* Table Felt - Updated to Golden Green mix */}
            <div className="absolute inset-1.5 bg-[radial-gradient(ellipse_at_center,_#064e3b_0%,_#022c22_65%,_#000000_100%)] flex items-center justify-center overflow-hidden rounded-[100px]">
              <div className={`absolute left-1/2 -translate-x-1/2 ${isMobile ? (playerCount <= 4 ? 'top-[28%]' : 'top-[36%]') + ' flex-col-reverse gap-12' : 'top-[30%] flex-col gap-4'} z-20 flex items-center`}>
                  <div className="bg-black/90 px-3.5 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1.5 shadow-2xl backdrop-blur-sm">
                    <span className="text-emerald-500 font-black text-[8px] tracking-widest uppercase">POT</span>
                    <span className="text-white font-mono font-black text-sm tracking-tight leading-none whitespace-nowrap">{(currentPot / BIG_BLIND_VALUE).toFixed(1)} BB</span>
                  </div>
                  {board.length > 0 && (
                    <div className="flex gap-1.5 animate-in fade-in zoom-in duration-700">
                      {board.map((card, i) => {
                        const rank = card[0]; const suit = card[1];
                        return (
                          <div key={i} className={`w-10 h-14 bg-white rounded-md shadow-2xl flex flex-col items-center justify-center leading-none ${getSuitColor(suit)} font-bold border border-gray-300 transform transition-transform hover:scale-105`}>
                            <span className="text-[16px] font-black">{rank === 'T' ? '10' : rank}</span>
                            <span className="text-[20px]">{getSuitSymbol(suit)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
              </div>
            </div>
          </div>
          <div className="absolute inset-0 w-full h-full pointer-events-none">
            {players.map((player, index) => (
              <div key={player.id} style={isMobile ? getMobilePlayerStyle(index, playerCount) : getDesktopPlayerStyle(index, playerCount)} className="absolute pointer-events-auto">
                <PlayerSeat player={player} isMain={player.positionName === activeScenario?.heroPos} bigBlindValue={BIG_BLIND_VALUE} timeRemaining={player.positionName === activeScenario?.heroPos ? timeRemaining : 0} maxTime={(player.positionName === activeScenario?.heroPos && timeBankSetting !== 'OFF') ? (timeBankSetting as number) : 0} totalPlayers={playerCount} isMobile={isMobile} className={`${getOrientationClass(index, isMobile, playerCount)} ${index === 0 ? (isMobile ? 'scale-[0.85]' : 'scale-[0.88]') : (isMobile ? 'scale-[0.72]' : 'scale-[0.82]')}`} />
              </div>
            ))}
          </div>
          <div className={`absolute ${isMobile ? 'bottom-[-60px]' : 'bottom-[-70px]'} w-full flex justify-center z-50 px-4`}>
             {feedback !== 'idle' ? (
               <div className={`py-3 px-8 rounded-full border font-black uppercase text-xs tracking-widest animate-in zoom-in duration-300 ${ feedback === 'correct' ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : feedback === 'timeout' ? 'bg-orange-600/20 border-orange-500 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'bg-red-600/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]' }`}> {feedback === 'correct' ? 'Decisão Correta' : feedback === 'timeout' ? 'Tempo Esgotado' : 'Decisão Errada'} </div>
             ) : renderActionButtons()}
          </div>
        </div>
      </div>
      <StopTrainingModal isOpen={showStopModal} onClose={() => setShowStopModal(false)} onConfirm={handleStopTrainingConfirm} />
      <SessionReportModal 
        isOpen={showReportModal} 
        onClose={onExitToSelection} 
        onNewTraining={onExitToSelection} 
        history={handHistory} 
        scenarioName={activeScenario?.name || "Treino PENTÁGONO"}
      />
      <RestartConfirmationModal isOpen={showRestartModal} onClose={() => setShowRestartModal(false)} onConfirm={handleRestartConfirm} />
      <SpotInfoModal 
        isOpen={showSpotInfoModal} 
        onClose={() => setShowSpotInfoModal(false)} 
        trainingName={activeScenario?.name || ""} 
        description={activeScenario?.description}
        videoLink={activeScenario?.videoLink}
      />
      <ConfigModal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} timeBank={timeBankSetting} setTimeBank={setTimeBankSetting} />
      <ScenarioCreatorModal isOpen={showScenarioCreatorModal} scenarios={scenarios} onClose={() => setShowScenarioCreatorModal(false)} onSave={handleSaveScenario} onDelete={handleDeleteScenario} />
      <AdminMemberModal isOpen={showAdminMemberModal} onClose={() => setShowAdminMemberModal(false)} />
    </div>
  );
};

export default App;
