
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
import ChangePasswordScreen from './components/ChangePasswordScreen.tsx';
import MobileWarningOverlay from './components/MobileWarningOverlay.tsx';

const BIG_BLIND_VALUE = 20;
const SCENARIOS_STORAGE_KEY = 'lab11_scenarios_v1';
const CURRENT_USER_KEY = 'gto_trainer_current_user';

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const SUITS = ['c', 'd', 'h', 's'];

const TABLE_LAYOUTS = {
  9: [
    { x: 50, y: 85, pos: 'bottom' },    // Hero / BTN
    { x: 18, y: 80, pos: 'left-bottom' },      // SB
    { x: 4,  y: 50, pos: 'left' },      // BB
    { x: 12, y: 18, pos: 'left-top' },      // UTG
    { x: 38, y: 11, pos: 'top' },       // UTG+1
    { x: 62, y: 11, pos: 'top' },       // MP
    { x: 88, y: 18, pos: 'right-top' },     // LJ
    { x: 96, y: 50, pos: 'right' },     // HJ
    { x: 82, y: 80, pos: 'right-bottom' },     // CO
  ],
  6: [
    { x: 50, y: 85, pos: 'bottom' },    // Hero / BTN
    { x: 15, y: 65, pos: 'left-bottom' },      // SB
    { x: 6,  y: 35, pos: 'left' },      // BB
    { x: 50, y: 18, pos: 'top' },       // LJ
    { x: 94, y: 35, pos: 'right' },     // HJ
    { x: 85, y: 65, pos: 'right-bottom' },     // CO
  ],
  4: [
    { x: 50, y: 85, pos: 'bottom' },
    { x: 15, y: 50, pos: 'left' },
    { x: 50, y: 18, pos: 'top' },
    { x: 85, y: 50, pos: 'right' },
  ],
  2: [
    { x: 50, y: 85, pos: 'bottom' },
    { x: 50, y: 18, pos: 'top' },
  ]
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

const CUSTOM_PALETTE = ['#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1', '#14b8a6', '#f43f5e', '#0ea5e9'];

const getActionColor = (label: string, index: number): string => {
  const l = label.toLowerCase();
  if (l.includes('fold')) return '#334155';
  if (l.includes('all-in') || l.includes('shove')) return '#ef4444';
  if (l.includes('call') || l.includes('pagar') || l === 'limp' || l === 'check') return '#10b981';
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

const SYSTEM_DEFAULT_SCENARIOS: Scenario[] = [
  // ... (keeping scenarios same as provided in input)
[
  {
    "id": "sc-1770426548944",
    "name": "OPEN SHOVE - 5bb",
    "description": "",
    "videoLink": "",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "open shove",
    "playerCount": 9,
    "heroPos": "UTG",
    "opponents": [],
    "stackBB": 5,
    "heroBetSize": 2.5,
    "ranges": {
      "22": {
        "Fold": 100
      },
      "33": {
        "Fold": 100
      },
      "44": {
        "ALL-IN": 100
      },
      "55": {
        "ALL-IN": 100
      },
      "66": {
        "ALL-IN": 100
      },
      "77": {
        "ALL-IN": 100
      },
      "88": {
        "ALL-IN": 100
      },
      "99": {
        "ALL-IN": 100
      },
      "AA": {
        "ALL-IN": 100
      },
      "AKs": {
        "ALL-IN": 100
      },
      "AQs": {
        "ALL-IN": 100
      },
      "AJs": {
        "ALL-IN": 100
      },
      "ATs": {
        "ALL-IN": 100
      },
      "A9s": {
        "ALL-IN": 100
      },
      "A8s": {
        "ALL-IN": 100
      },
      "A7s": {
        "ALL-IN": 100
      },
      "A6s": {
        "ALL-IN": 100
      },
      "A5s": {
        "ALL-IN": 100
      },
      "A4s": {
        "Fold": 100
      },
      "A3s": {
        "Fold": 100
      },
      "A2s": {
        "Fold": 100
      },
      "AKo": {
        "ALL-IN": 100
      },
      "KK": {
        "ALL-IN": 100
      },
      "KQs": {
        "ALL-IN": 100
      },
      "KJs": {
        "ALL-IN": 100
      },
      "KTs": {
        "ALL-IN": 100
      },
      "K9s": {
        "Fold": 100
      },
      "K8s": {
        "Fold": 100
      },
      "K7s": {
        "Fold": 100
      },
      "K6s": {
        "Fold": 100
      },
      "Q8s": {
        "Fold": 100
      },
      "QTs": {
        "Fold": 100
      },
      "Q9s": {
        "Fold": 100
      },
      "T9s": {
        "Fold": 100
      },
      "J9s": {
        "Fold": 100
      },
      "JTs": {
        "Fold": 100
      },
      "QJs": {
        "ALL-IN": 100
      },
      "QQ": {
        "ALL-IN": 100
      },
      "TT": {
        "ALL-IN": 100
      },
      "JJ": {
        "ALL-IN": 100
      },
      "T8s": {
        "Fold": 100
      },
      "98s": {
        "Fold": 100
      },
      "87s": {
        "Fold": 100
      },
      "A7o": {
        "Fold": 100
      },
      "A8o": {
        "Fold": 100
      },
      "A9o": {
        "ALL-IN": 100
      },
      "ATo": {
        "ALL-IN": 100
      },
      "AJo": {
        "ALL-IN": 100
      },
      "AQo": {
        "ALL-IN": 100
      },
      "KQo": {
        "ALL-IN": 100
      },
      "KJo": {
        "ALL-IN": 100
      },
      "KTo": {
        "Fold": 100
      },
      "QJo": {
        "Fold": 100
      },
      "K5s": {
        "Fold": 100
      },
      "K4s": {
        "Fold": 100
      },
      "K3s": {
        "Fold": 100
      },
      "K2s": {
        "Fold": 100
      },
      "Q7s": {
        "Fold": 100
      },
      "Q6s": {
        "Fold": 100
      },
      "Q5s": {
        "Fold": 100
      },
      "Q4s": {
        "Fold": 100
      },
      "Q3s": {
        "Fold": 100
      },
      "Q2s": {
        "Fold": 100
      },
      "J8s": {
        "Fold": 100
      },
      "J7s": {
        "Fold": 100
      },
      "J6s": {
        "Fold": 100
      },
      "J5s": {
        "Fold": 100
      },
      "J4s": {
        "Fold": 100
      },
      "J3s": {
        "Fold": 100
      },
      "J2s": {
        "Fold": 100
      },
      "T7s": {
        "Fold": 100
      },
      "T6s": {
        "Fold": 100
      },
      "T5s": {
        "Fold": 100
      },
      "T4s": {
        "Fold": 100
      },
      "T3s": {
        "Fold": 100
      },
      "T2s": {
        "Fold": 100
      },
      "97s": {
        "Fold": 100
      },
      "96s": {
        "Fold": 100
      },
      "95s": {
        "Fold": 100
      },
      "94s": {
        "Fold": 100
      },
      "93s": {
        "Fold": 100
      },
      "92s": {
        "Fold": 100
      },
      "86s": {
        "Fold": 100
      },
      "85s": {
        "Fold": 100
      },
      "84s": {
        "Fold": 100
      },
      "83s": {
        "Fold": 100
      },
      "82s": {
        "Fold": 100
      },
      "72s": {
        "Fold": 100
      },
      "73s": {
        "Fold": 100
      },
      "74s": {
        "Fold": 100
      },
      "75s": {
        "Fold": 100
      },
      "76s": {
        "Fold": 100
      },
      "65s": {
        "Fold": 100
      },
      "64s": {
        "Fold": 100
      },
      "63s": {
        "Fold": 100
      },
      "62s": {
        "Fold": 100
      },
      "54s": {
        "Fold": 100
      },
      "53s": {
        "Fold": 100
      },
      "52s": {
        "Fold": 100
      },
      "43s": {
        "Fold": 100
      },
      "42s": {
        "Fold": 100
      },
      "32s": {
        "Fold": 100
      },
      "QTo": {
        "Fold": 100
      },
      "Q9o": {
        "Fold": 100
      },
      "Q8o": {
        "Fold": 100
      },
      "Q7o": {
        "Fold": 100
      },
      "Q6o": {
        "Fold": 100
      },
      "Q5o": {
        "Fold": 100
      },
      "Q4o": {
        "Fold": 100
      },
      "Q3o": {
        "Fold": 100
      },
      "Q2o": {
        "Fold": 100
      },
      "J2o": {
        "Fold": 100
      },
      "J3o": {
        "Fold": 100
      },
      "J4o": {
        "Fold": 100
      },
      "J5o": {
        "Fold": 100
      },
      "J6o": {
        "Fold": 100
      },
      "J7o": {
        "Fold": 100
      },
      "J8o": {
        "Fold": 100
      },
      "J9o": {
        "Fold": 100
      },
      "JTo": {
        "Fold": 100
      },
      "T9o": {
        "Fold": 100
      },
      "T8o": {
        "Fold": 100
      },
      "T7o": {
        "Fold": 100
      },
      "T6o": {
        "Fold": 100
      },
      "T5o": {
        "Fold": 100
      },
      "T4o": {
        "Fold": 100
      },
      "T3o": {
        "Fold": 100
      },
      "T2o": {
        "Fold": 100
      },
      "98o": {
        "Fold": 100
      },
      "97o": {
        "Fold": 100
      },
      "96o": {
        "Fold": 100
      },
      "95o": {
        "Fold": 100
      },
      "94o": {
        "Fold": 100
      },
      "93o": {
        "Fold": 100
      },
      "92o": {
        "Fold": 100
      },
      "87o": {
        "Fold": 100
      },
      "86o": {
        "Fold": 100
      },
      "85o": {
        "Fold": 100
      },
      "84o": {
        "Fold": 100
      },
      "83o": {
        "Fold": 100
      },
      "82o": {
        "Fold": 100
      },
      "76o": {
        "Fold": 100
      },
      "75o": {
        "Fold": 100
      },
      "74o": {
        "Fold": 100
      },
      "73o": {
        "Fold": 100
      },
      "72o": {
        "Fold": 100
      },
      "65o": {
        "Fold": 100
      },
      "64o": {
        "Fold": 100
      },
      "63o": {
        "Fold": 100
      },
      "62o": {
        "Fold": 100
      },
      "54o": {
        "Fold": 100
      },
      "53o": {
        "Fold": 100
      },
      "52o": {
        "Fold": 100
      },
      "43o": {
        "Fold": 100
      },
      "42o": {
        "Fold": 100
      },
      "32o": {
        "Fold": 100
      },
      "K9o": {
        "Fold": 100
      },
      "K8o": {
        "Fold": 100
      },
      "K7o": {
        "Fold": 100
      },
      "K6o": {
        "Fold": 100
      },
      "K5o": {
        "Fold": 100
      },
      "K4o": {
        "Fold": 100
      },
      "K3o": {
        "Fold": 100
      },
      "K2o": {
        "Fold": 100
      },
      "A6o": {
        "Fold": 100
      },
      "A5o": {
        "Fold": 100
      },
      "A4o": {
        "Fold": 100
      },
      "A3o": {
        "Fold": 100
      },
      "A2o": {
        "Fold": 100
      }
    },
    "customActions": [
      "Fold",
      "ALL-IN"
    ],
    "updatedAt": 1770433243329
  },
  {
    "id": "sc-1770426660574",
    "name": "OPEN SHOVE - 5bb",
    "description": "",
    "videoLink": "",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "open shove",
    "playerCount": 9,
    "heroPos": "UTG+1",
    "opponents": [],
    "stackBB": 5,
    "heroBetSize": 2.5,
    "ranges": {
      "22": {
        "Fold": 100
      },
      "33": {
        "Fold": 100
      },
      "44": {
        "ALL-IN": 100
      },
      "55": {
        "ALL-IN": 100
      },
      "66": {
        "ALL-IN": 100
      },
      "77": {
        "ALL-IN": 100
      },
      "88": {
        "ALL-IN": 100
      },
      "99": {
        "ALL-IN": 100
      },
      "AA": {
        "ALL-IN": 100
      },
      "AKs": {
        "ALL-IN": 100
      },
      "AQs": {
        "ALL-IN": 100
      },
      "AJs": {
        "ALL-IN": 100
      },
      "ATs": {
        "ALL-IN": 100
      },
      "A9s": {
        "ALL-IN": 100
      },
      "A8s": {
        "ALL-IN": 100
      },
      "A7s": {
        "ALL-IN": 100
      },
      "A6s": {
        "ALL-IN": 100
      },
      "A5s": {
        "ALL-IN": 100
      },
      "A4s": {
        "ALL-IN": 100
      },
      "A3s": {
        "Fold": 100
      },
      "A2s": {
        "Fold": 100
      },
      "AKo": {
        "ALL-IN": 100
      },
      "KK": {
        "ALL-IN": 100
      },
      "KQs": {
        "ALL-IN": 100
      },
      "KJs": {
        "ALL-IN": 100
      },
      "KTs": {
        "ALL-IN": 100
      },
      "K9s": {
        "ALL-IN": 100
      },
      "K8s": {
        "Fold": 100
      },
      "K7s": {
        "Fold": 100
      },
      "K6s": {
        "Fold": 100
      },
      "Q8s": {
        "Fold": 100
      },
      "QTs": {
        "ALL-IN": 100
      },
      "Q9s": {
        "Fold": 100
      },
      "T9s": {
        "Fold": 100
      },
      "J9s": {
        "Fold": 100
      },
      "JTs": {
        "Fold": 100
      },
      "QJs": {
        "ALL-IN": 100
      },
      "QQ": {
        "ALL-IN": 100
      },
      "TT": {
        "ALL-IN": 100
      },
      "JJ": {
        "ALL-IN": 100
      },
      "T8s": {
        "Fold": 100
      },
      "98s": {
        "Fold": 100
      },
      "87s": {
        "Fold": 100
      },
      "A7o": {
        "Fold": 100
      },
      "A8o": {
        "Fold": 100
      },
      "A9o": {
        "ALL-IN": 100
      },
      "ATo": {
        "ALL-IN": 100
      },
      "AJo": {
        "ALL-IN": 100
      },
      "AQo": {
        "ALL-IN": 100
      },
      "KQo": {
        "ALL-IN": 100
      },
      "KJo": {
        "ALL-IN": 100
      },
      "KTo": {
        "Fold": 100
      },
      "QJo": {
        "Fold": 100
      },
      "K5s": {
        "Fold": 100
      },
      "K4s": {
        "Fold": 100
      },
      "K3s": {
        "Fold": 100
      },
      "K2s": {
        "Fold": 100
      },
      "Q7s": {
        "Fold": 100
      },
      "Q6s": {
        "Fold": 100
      },
      "Q5s": {
        "Fold": 100
      },
      "Q4s": {
        "Fold": 100
      },
      "Q3s": {
        "Fold": 100
      },
      "Q2s": {
        "Fold": 100
      },
      "J8s": {
        "Fold": 100
      },
      "J7s": {
        "Fold": 100
      },
      "J6s": {
        "Fold": 100
      },
      "J5s": {
        "Fold": 100
      },
      "J4s": {
        "Fold": 100
      },
      "J3s": {
        "Fold": 100
      },
      "J2s": {
        "Fold": 100
      },
      "T7s": {
        "Fold": 100
      },
      "T6s": {
        "Fold": 100
      },
      "T5s": {
        "Fold": 100
      },
      "T4s": {
        "Fold": 100
      },
      "T3s": {
        "Fold": 100
      },
      "T2s": {
        "Fold": 100
      },
      "97s": {
        "Fold": 100
      },
      "96s": {
        "Fold": 100
      },
      "95s": {
        "Fold": 100
      },
      "94s": {
        "Fold": 100
      },
      "93s": {
        "Fold": 100
      },
      "92s": {
        "Fold": 100
      },
      "86s": {
        "Fold": 100
      },
      "85s": {
        "Fold": 100
      },
      "84s": {
        "Fold": 100
      },
      "83s": {
        "Fold": 100
      },
      "82s": {
        "Fold": 100
      },
      "72s": {
        "Fold": 100
      },
      "73s": {
        "Fold": 100
      },
      "74s": {
        "Fold": 100
      },
      "75s": {
        "Fold": 100
      },
      "76s": {
        "Fold": 100
      },
      "65s": {
        "Fold": 100
      },
      "64s": {
        "Fold": 100
      },
      "63s": {
        "Fold": 100
      },
      "62s": {
        "Fold": 100
      },
      "54s": {
        "Fold": 100
      },
      "53s": {
        "Fold": 100
      },
      "52s": {
        "Fold": 100
      },
      "43s": {
        "Fold": 100
      },
      "42s": {
        "Fold": 100
      },
      "32s": {
        "Fold": 100
      },
      "QTo": {
        "Fold": 100
      },
      "Q9o": {
        "Fold": 100
      },
      "Q8o": {
        "Fold": 100
      },
      "Q7o": {
        "Fold": 100
      },
      "Q6o": {
        "Fold": 100
      },
      "Q5o": {
        "Fold": 100
      },
      "Q4o": {
        "Fold": 100
      },
      "Q3o": {
        "Fold": 100
      },
      "Q2o": {
        "Fold": 100
      },
      "J2o": {
        "Fold": 100
      },
      "J3o": {
        "Fold": 100
      },
      "J4o": {
        "Fold": 100
      },
      "J5o": {
        "Fold": 100
      },
      "J6o": {
        "Fold": 100
      },
      "J8o": {
        "Fold": 100
      },
      "J9o": {
        "Fold": 100
      },
      "JTo": {
        "Fold": 100
      },
      "T9o": {
        "Fold": 100
      },
      "T8o": {
        "Fold": 100
      },
      "T7o": {
        "Fold": 100
      },
      "T6o": {
        "Fold": 100
      },
      "T5o": {
        "Fold": 100
      },
      "T4o": {
        "Fold": 100
      },
      "T3o": {
        "Fold": 100
      },
      "T2o": {
        "Fold": 100
      },
      "98o": {
        "Fold": 100
      },
      "97o": {
        "Fold": 100
      },
      "96o": {
        "Fold": 100
      },
      "95o": {
        "Fold": 100
      },
      "94o": {
        "Fold": 100
      },
      "93o": {
        "Fold": 100
      },
      "92o": {
        "Fold": 100
      },
      "87o": {
        "Fold": 100
      },
      "86o": {
        "Fold": 100
      },
      "85o": {
        "Fold": 100
      },
      "84o": {
        "Fold": 100
      },
      "83o": {
        "Fold": 100
      },
      "82o": {
        "Fold": 100
      },
      "76o": {
        "Fold": 100
      },
      "75o": {
        "Fold": 100
      },
      "74o": {
        "Fold": 100
      },
      "73o": {
        "Fold": 100
      },
      "72o": {
        "Fold": 100
      },
      "65o": {
        "Fold": 100
      },
      "64o": {
        "Fold": 100
      },
      "63o": {
        "Fold": 100
      },
      "62o": {
        "Fold": 100
      },
      "54o": {
        "Fold": 100
      },
      "53o": {
        "Fold": 100
      },
      "52o": {
        "Fold": 100
      },
      "43o": {
        "Fold": 100
      },
      "42o": {
        "Fold": 100
      },
      "32o": {
        "Fold": 100
      },
      "K9o": {
        "Fold": 100
      },
      "K8o": {
        "Fold": 100
      },
      "K7o": {
        "Fold": 100
      },
      "K6o": {
        "Fold": 100
      },
      "K5o": {
        "Fold": 100
      },
      "K4o": {
        "Fold": 100
      },
      "K3o": {
        "Fold": 100
      },
      "K2o": {
        "Fold": 100
      },
      "A6o": {
        "Fold": 100
      },
      "A5o": {
        "Fold": 100
      },
      "A4o": {
        "Fold": 100
      },
      "A3o": {
        "Fold": 100
      },
      "A2o": {
        "Fold": 100
      },
      "J7o": {
        "Fold": 100
      }
    },
    "customActions": [
      "Fold",
      "ALL-IN"
    ],
    "updatedAt": 1770433265979
  },
  {
    "id": "sc-1770426694120",
    "name": "OPEN SHOVE - 5bb",
    "description": "",
    "videoLink": "",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "open shove",
    "playerCount": 9,
    "heroPos": "MP",
    "opponents": [],
    "stackBB": 5,
    "heroBetSize": 2.5,
    "ranges": {
      "22": {
        "Fold": 100
      },
      "33": {
        "Fold": 100
      },
      "44": {
        "ALL-IN": 100
      },
      "55": {
        "ALL-IN": 100
      },
      "66": {
        "ALL-IN": 100
      },
      "77": {
        "ALL-IN": 100
      },
      "88": {
        "ALL-IN": 100
      },
      "99": {
        "ALL-IN": 100
      },
      "AA": {
        "ALL-IN": 100
      },
      "AKs": {
        "ALL-IN": 100
      },
      "AQs": {
        "ALL-IN": 100
      },
      "AJs": {
        "ALL-IN": 100
      },
      "ATs": {
        "ALL-IN": 100
      },
      "A9s": {
        "ALL-IN": 100
      },
      "A8s": {
        "ALL-IN": 100
      },
      "A7s": {
        "ALL-IN": 100
      },
      "A6s": {
        "ALL-IN": 100
      },
      "A5s": {
        "ALL-IN": 100
      },
      "A4s": {
        "ALL-IN": 100
      },
      "A3s": {
        "ALL-IN": 100
      },
      "A2s": {
        "ALL-IN": 100
      },
      "AKo": {
        "ALL-IN": 100
      },
      "KK": {
        "ALL-IN": 100
      },
      "KQs": {
        "ALL-IN": 100
      },
      "KJs": {
        "ALL-IN": 100
      },
      "KTs": {
        "ALL-IN": 100
      },
      "K9s": {
        "ALL-IN": 100
      },
      "K8s": {
        "Fold": 100
      },
      "K7s": {
        "Fold": 100
      },
      "K6s": {
        "Fold": 100
      },
      "Q8s": {
        "Fold": 100
      },
      "QTs": {
        "ALL-IN": 100
      },
      "Q9s": {
        "Fold": 100
      },
      "T9s": {
        "Fold": 100
      },
      "J9s": {
        "Fold": 100
      },
      "JTs": {
        "ALL-IN": 100
      },
      "QJs": {
        "ALL-IN": 100
      },
      "QQ": {
        "ALL-IN": 100
      },
      "TT": {
        "ALL-IN": 100
      },
      "JJ": {
        "ALL-IN": 100
      },
      "T8s": {
        "Fold": 100
      },
      "98s": {
        "Fold": 100
      },
      "87s": {
        "Fold": 100
      },
      "A7o": {
        "Fold": 100
      },
      "A8o": {
        "ALL-IN": 100
      },
      "A9o": {
        "ALL-IN": 100
      },
      "ATo": {
        "ALL-IN": 100
      },
      "AJo": {
        "ALL-IN": 100
      },
      "AQo": {
        "ALL-IN": 100
      },
      "KQo": {
        "ALL-IN": 100
      },
      "KJo": {
        "ALL-IN": 100
      },
      "KTo": {
        "ALL-IN": 100
      },
      "QJo": {
        "Fold": 100
      },
      "K5s": {
        "Fold": 100
      },
      "K4s": {
        "Fold": 100
      },
      "K2s": {
        "Fold": 100
      },
      "Q7s": {
        "Fold": 100
      },
      "Q6s": {
        "Fold": 100
      },
      "Q5s": {
        "Fold": 100
      },
      "Q4s": {
        "Fold": 100
      },
      "Q3s": {
        "Fold": 100
      },
      "Q2s": {
        "Fold": 100
      },
      "J8s": {
        "Fold": 100
      },
      "J7s": {
        "Fold": 100
      },
      "J6s": {
        "Fold": 100
      },
      "J5s": {
        "Fold": 100
      },
      "J4s": {
        "Fold": 100
      },
      "J3s": {
        "Fold": 100
      },
      "J2s": {
        "Fold": 100
      },
      "T7s": {
        "Fold": 100
      },
      "T6s": {
        "Fold": 100
      },
      "T5s": {
        "Fold": 100
      },
      "T4s": {
        "Fold": 100
      },
      "T3s": {
        "Fold": 100
      },
      "T2s": {
        "Fold": 100
      },
      "97s": {
        "Fold": 100
      },
      "96s": {
        "Fold": 100
      },
      "95s": {
        "Fold": 100
      },
      "94s": {
        "Fold": 100
      },
      "93s": {
        "Fold": 100
      },
      "92s": {
        "Fold": 100
      },
      "86s": {
        "Fold": 100
      },
      "85s": {
        "Fold": 100
      },
      "84s": {
        "Fold": 100
      },
      "83s": {
        "Fold": 100
      },
      "82s": {
        "Fold": 100
      },
      "72s": {
        "Fold": 100
      },
      "73s": {
        "Fold": 100
      },
      "74s": {
        "Fold": 100
      },
      "75s": {
        "Fold": 100
      },
      "76s": {
        "Fold": 100
      },
      "65s": {
        "Fold": 100
      },
      "64s": {
        "Fold": 100
      },
      "63s": {
        "Fold": 100
      },
      "62s": {
        "Fold": 100
      },
      "54s": {
        "Fold": 100
      },
      "53s": {
        "Fold": 100
      },
      "52s": {
        "Fold": 100
      },
      "43s": {
        "Fold": 100
      },
      "42s": {
        "Fold": 100
      },
      "32s": {
        "Fold": 100
      },
      "Q9o": {
        "Fold": 100
      },
      "Q8o": {
        "Fold": 100
      },
      "Q7o": {
        "Fold": 100
      },
      "Q6o": {
        "Fold": 100
      },
      "Q5o": {
        "Fold": 100
      },
      "Q4o": {
        "Fold": 100
      },
      "Q3o": {
        "Fold": 100
      },
      "Q2o": {
        "Fold": 100
      },
      "J2o": {
        "Fold": 100
      },
      "J3o": {
        "Fold": 100
      },
      "J4o": {
        "Fold": 100
      },
      "J5o": {
        "Fold": 100
      },
      "J6o": {
        "Fold": 100
      },
      "J8o": {
        "Fold": 100
      },
      "J9o": {
        "Fold": 100
      },
      "JTo": {
        "Fold": 100
      },
      "T9o": {
        "Fold": 100
      },
      "T8o": {
        "Fold": 100
      },
      "T7o": {
        "Fold": 100
      },
      "T6o": {
        "Fold": 100
      },
      "T5o": {
        "Fold": 100
      },
      "T4o": {
        "Fold": 100
      },
      "T3o": {
        "Fold": 100
      },
      "T2o": {
        "Fold": 100
      },
      "98o": {
        "Fold": 100
      },
      "97o": {
        "Fold": 100
      },
      "96o": {
        "Fold": 100
      },
      "95o": {
        "Fold": 100
      },
      "94o": {
        "Fold": 100
      },
      "93o": {
        "Fold": 100
      },
      "92o": {
        "Fold": 100
      },
      "87o": {
        "Fold": 100
      },
      "86o": {
        "Fold": 100
      },
      "85o": {
        "Fold": 100
      },
      "84o": {
        "Fold": 100
      },
      "83o": {
        "Fold": 100
      },
      "82o": {
        "Fold": 100
      },
      "76o": {
        "Fold": 100
      },
      "75o": {
        "Fold": 100
      },
      "74o": {
        "Fold": 100
      },
      "73o": {
        "Fold": 100
      },
      "72o": {
        "Fold": 100
      },
      "65o": {
        "Fold": 100
      },
      "64o": {
        "Fold": 100
      },
      "63o": {
        "Fold": 100
      },
      "62o": {
        "Fold": 100
      },
      "54o": {
        "Fold": 100
      },
      "53o": {
        "Fold": 100
      },
      "52o": {
        "Fold": 100
      },
      "43o": {
        "Fold": 100
      },
      "42o": {
        "Fold": 100
      },
      "32o": {
        "Fold": 100
      },
      "K9o": {
        "Fold": 100
      },
      "K8o": {
        "Fold": 100
      },
      "K7o": {
        "Fold": 100
      },
      "K6o": {
        "Fold": 100
      },
      "K5o": {
        "Fold": 100
      },
      "K4o": {
        "Fold": 100
      },
      "K3o": {
        "Fold": 100
      },
      "K2o": {
        "Fold": 100
      },
      "A6o": {
        "Fold": 100
      },
      "A5o": {
        "Fold": 100
      },
      "A4o": {
        "Fold": 100
      },
      "A3o": {
        "Fold": 100
      },
      "A2o": {
        "Fold": 100
      },
      "J7o": {
        "Fold": 100
      },
      "K3s": {
        "Fold": 100
      },
      "QTo": {
        "Fold": 100
      }
    },
    "customActions": [
      "Fold",
      "ALL-IN"
    ]
  },
  {
    "id": "sc-1770426772232",
    "name": "OPEN SHOVE - 5bb",
    "description": "",
    "videoLink": "",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "open shove",
    "playerCount": 9,
    "heroPos": "LJ",
    "opponents": [],
    "stackBB": 5,
    "heroBetSize": 2.5,
    "ranges": {
      "22": {
        "Fold": 100
      },
      "33": {
        "ALL-IN": 100
      },
      "44": {
        "ALL-IN": 100
      },
      "55": {
        "ALL-IN": 100
      },
      "66": {
        "ALL-IN": 100
      },
      "77": {
        "ALL-IN": 100
      },
      "88": {
        "ALL-IN": 100
      },
      "99": {
        "ALL-IN": 100
      },
      "AA": {
        "ALL-IN": 100
      },
      "AKs": {
        "ALL-IN": 100
      },
      "AQs": {
        "ALL-IN": 100
      },
      "AJs": {
        "ALL-IN": 100
      },
      "ATs": {
        "ALL-IN": 100
      },
      "A9s": {
        "ALL-IN": 100
      },
      "A8s": {
        "ALL-IN": 100
      },
      "A7s": {
        "ALL-IN": 100
      },
      "A6s": {
        "ALL-IN": 100
      },
      "A5s": {
        "ALL-IN": 100
      },
      "A4s": {
        "ALL-IN": 100
      },
      "A3s": {
        "ALL-IN": 100
      },
      "A2s": {
        "ALL-IN": 100
      },
      "AKo": {
        "ALL-IN": 100
      },
      "KK": {
        "ALL-IN": 100
      },
      "KQs": {
        "ALL-IN": 100
      },
      "KJs": {
        "ALL-IN": 100
      },
      "KTs": {
        "ALL-IN": 100
      },
      "K9s": {
        "ALL-IN": 100
      },
      "K8s": {
        "ALL-IN": 100
      },
      "K7s": {
        "Fold": 100
      },
      "K6s": {
        "Fold": 100
      },
      "Q8s": {
        "Fold": 100
      },
      "QTs": {
        "ALL-IN": 100
      },
      "Q9s": {
        "ALL-IN": 100
      },
      "T9s": {
        "Fold": 100
      },
      "J9s": {
        "Fold": 100
      },
      "JTs": {
        "ALL-IN": 100
      },
      "QJs": {
        "ALL-IN": 100
      },
      "QQ": {
        "ALL-IN": 100
      },
      "TT": {
        "ALL-IN": 100
      },
      "JJ": {
        "ALL-IN": 100
      },
      "T8s": {
        "Fold": 100
      },
      "98s": {
        "Fold": 100
      },
      "87s": {
        "Fold": 100
      },
      "A7o": {
        "ALL-IN": 100
      },
      "A8o": {
        "ALL-IN": 100
      },
      "A9o": {
        "ALL-IN": 100
      },
      "ATo": {
        "ALL-IN": 100
      },
      "AJo": {
        "ALL-IN": 100
      },
      "AQo": {
        "ALL-IN": 100
      },
      "KQo": {
        "ALL-IN": 100
      },
      "KJo": {
        "ALL-IN": 100
      },
      "KTo": {
        "ALL-IN": 100
      },
      "QJo": {
        "ALL-IN": 100
      },
      "K5s": {
        "Fold": 100
      },
      "K4s": {
        "Fold": 100
      },
      "K2s": {
        "Fold": 100
      },
      "Q7s": {
        "Fold": 100
      },
      "Q6s": {
        "Fold": 100
      },
      "Q5s": {
        "Fold": 100
      },
      "Q4s": {
        "Fold": 100
      },
      "Q3s": {
        "Fold": 100
      },
      "Q2s": {
        "Fold": 100
      },
      "J8s": {
        "Fold": 100
      },
      "J7s": {
        "Fold": 100
      },
      "J6s": {
        "Fold": 100
      },
      "J5s": {
        "Fold": 100
      },
      "J4s": {
        "Fold": 100
      },
      "J3s": {
        "Fold": 100
      },
      "J2s": {
        "Fold": 100
      },
      "T7s": {
        "Fold": 100
      },
      "T6s": {
        "Fold": 100
      },
      "T5s": {
        "Fold": 100
      },
      "T4s": {
        "Fold": 100
      },
      "T3s": {
        "Fold": 100
      },
      "T2s": {
        "Fold": 100
      },
      "97s": {
        "Fold": 100
      },
      "96s": {
        "Fold": 100
      },
      "95s": {
        "Fold": 100
      },
      "94s": {
        "Fold": 100
      },
      "93s": {
        "Fold": 100
      },
      "92s": {
        "Fold": 100
      },
      "86s": {
        "Fold": 100
      },
      "85s": {
        "Fold": 100
      },
      "84s": {
        "Fold": 100
      },
      "83s": {
        "Fold": 100
      },
      "82s": {
        "Fold": 100
      },
      "72s": {
        "Fold": 100
      },
      "73s": {
        "Fold": 100
      },
      "74s": {
        "Fold": 100
      },
      "75s": {
        "Fold": 100
      },
      "76s": {
        "Fold": 100
      },
      "65s": {
        "Fold": 100
      },
      "64s": {
        "Fold": 100
      },
      "63s": {
        "Fold": 100
      },
      "62s": {
        "Fold": 100
      },
      "54s": {
        "Fold": 100
      },
      "53s": {
        "Fold": 100
      },
      "52s": {
        "Fold": 100
      },
      "43s": {
        "Fold": 100
      },
      "42s": {
        "Fold": 100
      },
      "32s": {
        "Fold": 100
      },
      "Q9o": {
        "Fold": 100
      },
      "Q8o": {
        "Fold": 100
      },
      "Q7o": {
        "Fold": 100
      },
      "Q6o": {
        "Fold": 100
      },
      "Q5o": {
        "Fold": 100
      },
      "Q4o": {
        "Fold": 100
      },
      "Q3o": {
        "Fold": 100
      },
      "Q2o": {
        "Fold": 100
      },
      "J2o": {
        "Fold": 100
      },
      "J3o": {
        "Fold": 100
      },
      "J4o": {
        "Fold": 100
      },
      "J5o": {
        "Fold": 100
      },
      "J6o": {
        "Fold": 100
      },
      "J8o": {
        "Fold": 100
      },
      "J9o": {
        "Fold": 100
      },
      "JTo": {
        "Fold": 100
      },
      "T9o": {
        "Fold": 100
      },
      "T8o": {
        "Fold": 100
      },
      "T7o": {
        "Fold": 100
      },
      "T6o": {
        "Fold": 100
      },
      "T5o": {
        "Fold": 100
      },
      "T4o": {
        "Fold": 100
      },
      "T3o": {
        "Fold": 100
      },
      "T2o": {
        "Fold": 100
      },
      "98o": {
        "Fold": 100
      },
      "97o": {
        "Fold": 100
      },
      "96o": {
        "Fold": 100
      },
      "95o": {
        "Fold": 100
      },
      "94o": {
        "Fold": 100
      },
      "93o": {
        "Fold": 100
      },
      "92o": {
        "Fold": 100
      },
      "87o": {
        "Fold": 100
      },
      "86o": {
        "Fold": 100
      },
      "85o": {
        "Fold": 100
      },
      "84o": {
        "Fold": 100
      },
      "83o": {
        "Fold": 100
      },
      "82o": {
        "Fold": 100
      },
      "76o": {
        "Fold": 100
      },
      "75o": {
        "Fold": 100
      },
      "74o": {
        "Fold": 100
      },
      "73o": {
        "Fold": 100
      },
      "72o": {
        "Fold": 100
      },
      "65o": {
        "Fold": 100
      },
      "64o": {
        "Fold": 100
      },
      "63o": {
        "Fold": 100
      },
      "62o": {
        "Fold": 100
      },
      "54o": {
        "Fold": 100
      },
      "53o": {
        "Fold": 100
      },
      "52o": {
        "Fold": 100
      },
      "43o": {
        "Fold": 100
      },
      "42o": {
        "Fold": 100
      },
      "32o": {
        "Fold": 100
      },
      "K9o": {
        "Fold": 100
      },
      "K8o": {
        "Fold": 100
      },
      "K7o": {
        "Fold": 100
      },
      "K6o": {
        "Fold": 100
      },
      "K5o": {
        "Fold": 100
      },
      "K4o": {
        "Fold": 100
      },
      "K3o": {
        "Fold": 100
      },
      "K2o": {
        "Fold": 100
      },
      "A6o": {
        "Fold": 100
      },
      "A5o": {
        "Fold": 100
      },
      "A4o": {
        "Fold": 100
      },
      "A3o": {
        "Fold": 100
      },
      "A2o": {
        "Fold": 100
      },
      "J7o": {
        "Fold": 100
      },
      "K3s": {
        "Fold": 100
      },
      "QTo": {
        "Fold": 100
      }
    },
    "customActions": [
      "Fold",
      "ALL-IN"
    ]
  },
  {
    "id": "sc-1770426815108",
    "name": "OPEN SHOVE - 5bb",
    "description": "",
    "videoLink": "",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "open shove",
    "playerCount": 9,
    "heroPos": "HJ",
    "opponents": [],
    "stackBB": 5,
    "heroBetSize": 2.5,
    "ranges": {
      "22": {
        "Fold": 100
      },
      "33": {
        "ALL-IN": 100
      },
      "44": {
        "ALL-IN": 100
      },
      "55": {
        "ALL-IN": 100
      },
      "66": {
        "ALL-IN": 100
      },
      "77": {
        "ALL-IN": 100
      },
      "88": {
        "ALL-IN": 100
      },
      "99": {
        "ALL-IN": 100
      },
      "AA": {
        "ALL-IN": 100
      },
      "AKs": {
        "ALL-IN": 100
      },
      "AQs": {
        "ALL-IN": 100
      },
      "AJs": {
        "ALL-IN": 100
      },
      "ATs": {
        "ALL-IN": 100
      },
      "A9s": {
        "ALL-IN": 100
      },
      "A8s": {
        "ALL-IN": 100
      },
      "A7s": {
        "ALL-IN": 100
      },
      "A6s": {
        "ALL-IN": 100
      },
      "A5s": {
        "ALL-IN": 100
      },
      "A4s": {
        "ALL-IN": 100
      },
      "A3s": {
        "ALL-IN": 100
      },
      "A2s": {
        "ALL-IN": 100
      },
      "AKo": {
        "ALL-IN": 100
      },
      "KK": {
        "ALL-IN": 100
      },
      "KQs": {
        "ALL-IN": 100
      },
      "KJs": {
        "ALL-IN": 100
      },
      "KTs": {
        "ALL-IN": 100
      },
      "K9s": {
        "ALL-IN": 100
      },
      "K8s": {
        "ALL-IN": 100
      },
      "K7s": {
        "ALL-IN": 100
      },
      "K6s": {
        "ALL-IN": 100
      },
      "Q8s": {
        "ALL-IN": 100
      },
      "QTs": {
        "ALL-IN": 100
      },
      "Q9s": {
        "ALL-IN": 100
      },
      "T9s": {
        "ALL-IN": 100
      },
      "J9s": {
        "ALL-IN": 100
      },
      "JTs": {
        "ALL-IN": 100
      },
      "QJs": {
        "ALL-IN": 100
      },
      "QQ": {
        "ALL-IN": 100
      },
      "TT": {
        "ALL-IN": 100
      },
      "JJ": {
        "ALL-IN": 100
      },
      "T8s": {
        "Fold": 100
      },
      "98s": {
        "Fold": 100
      },
      "87s": {
        "Fold": 100
      },
      "A7o": {
        "ALL-IN": 100
      },
      "A8o": {
        "ALL-IN": 100
      },
      "A9o": {
        "ALL-IN": 100
      },
      "ATo": {
        "ALL-IN": 100
      },
      "AJo": {
        "ALL-IN": 100
      },
      "AQo": {
        "ALL-IN": 100
      },
      "KQo": {
        "ALL-IN": 100
      },
      "KJo": {
        "ALL-IN": 100
      },
      "KTo": {
        "ALL-IN": 100
      },
      "QJo": {
        "ALL-IN": 100
      },
      "K5s": {
        "Fold": 100
      },
      "K4s": {
        "Fold": 100
      },
      "K2s": {
        "Fold": 100
      },
      "Q7s": {
        "Fold": 100
      },
      "Q6s": {
        "Fold": 100
      },
      "Q5s": {
        "Fold": 100
      },
      "Q4s": {
        "Fold": 100
      },
      "Q3s": {
        "Fold": 100
      },
      "Q2s": {
        "Fold": 100
      },
      "J8s": {
        "Fold": 100
      },
      "J7s": {
        "Fold": 100
      },
      "J6s": {
        "Fold": 100
      },
      "J5s": {
        "Fold": 100
      },
      "J4s": {
        "Fold": 100
      },
      "J3s": {
        "Fold": 100
      },
      "J2s": {
        "Fold": 100
      },
      "T7s": {
        "Fold": 100
      },
      "T6s": {
        "Fold": 100
      },
      "T5s": {
        "Fold": 100
      },
      "T4s": {
        "Fold": 100
      },
      "T3s": {
        "Fold": 100
      },
      "T2s": {
        "Fold": 100
      },
      "97s": {
        "Fold": 100
      },
      "96s": {
        "Fold": 100
      },
      "95s": {
        "Fold": 100
      },
      "94s": {
        "Fold": 100
      },
      "93s": {
        "Fold": 100
      },
      "92s": {
        "Fold": 100
      },
      "86s": {
        "Fold": 100
      },
      "85s": {
        "Fold": 100
      },
      "84s": {
        "Fold": 100
      },
      "83s": {
        "Fold": 100
      },
      "82s": {
        "Fold": 100
      },
      "72s": {
        "Fold": 100
      },
      "73s": {
        "Fold": 100
      },
      "74s": {
        "Fold": 100
      },
      "75s": {
        "Fold": 100
      },
      "76s": {
        "Fold": 100
      },
      "65s": {
        "Fold": 100
      },
      "64s": {
        "Fold": 100
      },
      "63s": {
        "Fold": 100
      },
      "62s": {
        "Fold": 100
      },
      "54s": {
        "Fold": 100
      },
      "53s": {
        "Fold": 100
      },
      "52s": {
        "Fold": 100
      },
      "43s": {
        "Fold": 100
      },
      "42s": {
        "Fold": 100
      },
      "32s": {
        "Fold": 100
      },
      "Q9o": {
        "Fold": 100
      },
      "Q8o": {
        "Fold": 100
      },
      "Q7o": {
        "Fold": 100
      },
      "Q6o": {
        "Fold": 100
      },
      "Q5o": {
        "Fold": 100
      },
      "Q4o": {
        "Fold": 100
      },
      "Q3o": {
        "Fold": 100
      },
      "Q2o": {
        "Fold": 100
      },
      "J2o": {
        "Fold": 100
      },
      "J3o": {
        "Fold": 100
      },
      "J4o": {
        "Fold": 100
      },
      "J5o": {
        "Fold": 100
      },
      "J6o": {
        "Fold": 100
      },
      "J8o": {
        "Fold": 100
      },
      "J9o": {
        "Fold": 100
      },
      "JTo": {
        "Fold": 100
      },
      "T9o": {
        "Fold": 100
      },
      "T8o": {
        "Fold": 100
      },
      "T7o": {
        "Fold": 100
      },
      "T6o": {
        "Fold": 100
      },
      "T5o": {
        "Fold": 100
      },
      "T4o": {
        "Fold": 100
      },
      "T3o": {
        "Fold": 100
      },
      "T2o": {
        "Fold": 100
      },
      "98o": {
        "Fold": 100
      },
      "97o": {
        "Fold": 100
      },
      "96o": {
        "Fold": 100
      },
      "95o": {
        "Fold": 100
      },
      "94o": {
        "Fold": 100
      },
      "93o": {
        "Fold": 100
      },
      "92o": {
        "Fold": 100
      },
      "87o": {
        "Fold": 100
      },
      "86o": {
        "Fold": 100
      },
      "85o": {
        "Fold": 100
      },
      "84o": {
        "Fold": 100
      },
      "83o": {
        "Fold": 100
      },
      "82o": {
        "Fold": 100
      },
      "76o": {
        "Fold": 100
      },
      "75o": {
        "Fold": 100
      },
      "74o": {
        "Fold": 100
      },
      "73o": {
        "Fold": 100
      },
      "72o": {
        "Fold": 100
      },
      "65o": {
        "Fold": 100
      },
      "64o": {
        "Fold": 100
      },
      "63o": {
        "Fold": 100
      },
      "62o": {
        "Fold": 100
      },
      "54o": {
        "Fold": 100
      },
      "53o": {
        "Fold": 100
      },
      "52o": {
        "Fold": 100
      },
      "43o": {
        "Fold": 100
      },
      "42o": {
        "Fold": 100
      },
      "32o": {
        "Fold": 100
      },
      "K9o": {
        "ALL-IN": 100
      },
      "K8o": {
        "Fold": 100
      },
      "K7o": {
        "Fold": 100
      },
      "K6o": {
        "Fold": 100
      },
      "K5o": {
        "Fold": 100
      },
      "K4o": {
        "Fold": 100
      },
      "K3o": {
        "Fold": 100
      },
      "K2o": {
        "Fold": 100
      },
      "A6o": {
        "ALL-IN": 100
      },
      "A5o": {
        "ALL-IN": 100
      },
      "A4o": {
        "ALL-IN": 100
      },
      "A3o": {
        "Fold": 100
      },
      "A2o": {
        "Fold": 100
      },
      "J7o": {
        "Fold": 100
      },
      "K3s": {
        "Fold": 100
      },
      "QTo": {
        "ALL-IN": 100
      }
    },
    "customActions": [
      "Fold",
      "ALL-IN"
    ]
  },
  {
    "id": "sc-1770426948340",
    "name": "OPEN SHOVE - 5bb",
    "description": "",
    "videoLink": "",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "open shove",
    "playerCount": 9,
    "heroPos": "CO",
    "opponents": [],
    "stackBB": 5,
    "heroBetSize": 2.5,
    "ranges": {
      "22": {
        "ALL-IN": 100
      },
      "33": {
        "ALL-IN": 100
      },
      "44": {
        "ALL-IN": 100
      },
      "55": {
        "ALL-IN": 100
      },
      "66": {
        "ALL-IN": 100
      },
      "77": {
        "ALL-IN": 100
      },
      "88": {
        "ALL-IN": 100
      },
      "99": {
        "ALL-IN": 100
      },
      "AA": {
        "ALL-IN": 100
      },
      "AKs": {
        "ALL-IN": 100
      },
      "AQs": {
        "ALL-IN": 100
      },
      "AJs": {
        "ALL-IN": 100
      },
      "ATs": {
        "ALL-IN": 100
      },
      "A9s": {
        "ALL-IN": 100
      },
      "A8s": {
        "ALL-IN": 100
      },
      "A7s": {
        "ALL-IN": 100
      },
      "A6s": {
        "ALL-IN": 100
      },
      "A5s": {
        "ALL-IN": 100
      },
      "A4s": {
        "ALL-IN": 100
      },
      "A3s": {
        "ALL-IN": 100
      },
      "A2s": {
        "ALL-IN": 100
      },
      "AKo": {
        "ALL-IN": 100
      },
      "KK": {
        "ALL-IN": 100
      },
      "KQs": {
        "ALL-IN": 100
      },
      "KJs": {
        "ALL-IN": 100
      },
      "KTs": {
        "ALL-IN": 100
      },
      "K9s": {
        "ALL-IN": 100
      },
      "K8s": {
        "ALL-IN": 100
      },
      "K7s": {
        "ALL-IN": 100
      },
      "K6s": {
        "ALL-IN": 100
      },
      "Q8s": {
        "ALL-IN": 100
      },
      "QTs": {
        "ALL-IN": 100
      },
      "Q9s": {
        "ALL-IN": 100
      },
      "T9s": {
        "ALL-IN": 100
      },
      "J9s": {
        "ALL-IN": 100
      },
      "JTs": {
        "ALL-IN": 100
      },
      "QJs": {
        "ALL-IN": 100
      },
      "QQ": {
        "ALL-IN": 100
      },
      "TT": {
        "ALL-IN": 100
      },
      "JJ": {
        "ALL-IN": 100
      },
      "T8s": {
        "Fold": 100
      },
      "98s": {
        "Fold": 100
      },
      "87s": {
        "Fold": 100
      },
      "A7o": {
        "ALL-IN": 100
      },
      "A8o": {
        "ALL-IN": 100
      },
      "A9o": {
        "ALL-IN": 100
      },
      "ATo": {
        "ALL-IN": 100
      },
      "AJo": {
        "ALL-IN": 100
      },
      "AQo": {
        "ALL-IN": 100
      },
      "KQo": {
        "ALL-IN": 100
      },
      "KJo": {
        "ALL-IN": 100
      },
      "KTo": {
        "ALL-IN": 100
      },
      "QJo": {
        "ALL-IN": 100
      },
      "K5s": {
        "ALL-IN": 100
      },
      "K4s": {
        "ALL-IN": 100
      },
      "K2s": {
        "Fold": 100
      },
      "Q7s": {
        "Fold": 100
      },
      "Q6s": {
        "Fold": 100
      },
      "Q5s": {
        "Fold": 100
      },
      "Q4s": {
        "Fold": 100
      },
      "Q3s": {
        "Fold": 100
      },
      "Q2s": {
        "Fold": 100
      },
      "J8s": {
        "ALL-IN": 100
      },
      "J7s": {
        "Fold": 100
      },
      "J6s": {
        "Fold": 100
      },
      "J5s": {
        "Fold": 100
      },
      "J4s": {
        "Fold": 100
      },
      "J3s": {
        "Fold": 100
      },
      "J2s": {
        "Fold": 100
      },
      "T7s": {
        "Fold": 100
      },
      "T6s": {
        "Fold": 100
      },
      "T5s": {
        "Fold": 100
      },
      "T4s": {
        "Fold": 100
      },
      "T3s": {
        "Fold": 100
      },
      "T2s": {
        "Fold": 100
      },
      "97s": {
        "Fold": 100
      },
      "96s": {
        "Fold": 100
      },
      "95s": {
        "Fold": 100
      },
      "94s": {
        "Fold": 100
      },
      "93s": {
        "Fold": 100
      },
      "92s": {
        "Fold": 100
      },
      "86s": {
        "Fold": 100
      },
      "85s": {
        "Fold": 100
      },
      "84s": {
        "Fold": 100
      },
      "83s": {
        "Fold": 100
      },
      "82s": {
        "Fold": 100
      },
      "72s": {
        "Fold": 100
      },
      "73s": {
        "Fold": 100
      },
      "74s": {
        "Fold": 100
      },
      "75s": {
        "Fold": 100
      },
      "76s": {
        "Fold": 100
      },
      "65s": {
        "Fold": 100
      },
      "64s": {
        "Fold": 100
      },
      "63s": {
        "Fold": 100
      },
      "62s": {
        "Fold": 100
      },
      "54s": {
        "Fold": 100
      },
      "53s": {
        "Fold": 100
      },
      "52s": {
        "Fold": 100
      },
      "43s": {
        "Fold": 100
      },
      "42s": {
        "Fold": 100
      },
      "32s": {
        "Fold": 100
      },
      "Q9o": {
        "ALL-IN": 100
      },
      "Q8o": {
        "Fold": 100
      },
      "Q7o": {
        "Fold": 100
      },
      "Q6o": {
        "Fold": 100
      },
      "Q5o": {
        "Fold": 100
      },
      "Q4o": {
        "Fold": 100
      },
      "Q3o": {
        "Fold": 100
      },
      "Q2o": {
        "Fold": 100
      },
      "J2o": {
        "Fold": 100
      },
      "J3o": {
        "Fold": 100
      },
      "J4o": {
        "Fold": 100
      },
      "J5o": {
        "Fold": 100
      },
      "J6o": {
        "Fold": 100
      },
      "J8o": {
        "Fold": 100
      },
      "J9o": {
        "Fold": 100
      },
      "JTo": {
        "ALL-IN": 100
      },
      "T9o": {
        "Fold": 100
      },
      "T8o": {
        "Fold": 100
      },
      "T7o": {
        "Fold": 100
      },
      "T6o": {
        "Fold": 100
      },
      "T5o": {
        "Fold": 100
      },
      "T4o": {
        "Fold": 100
      },
      "T3o": {
        "Fold": 100
      },
      "T2o": {
        "Fold": 100
      },
      "98o": {
        "Fold": 100
      },
      "97o": {
        "Fold": 100
      },
      "96o": {
        "Fold": 100
      },
      "95o": {
        "Fold": 100
      },
      "94o": {
        "Fold": 100
      },
      "93o": {
        "Fold": 100
      },
      "92o": {
        "Fold": 100
      },
      "87o": {
        "Fold": 100
      },
      "86o": {
        "Fold": 100
      },
      "85o": {
        "Fold": 100
      },
      "84o": {
        "Fold": 100
      },
      "83o": {
        "Fold": 100
      },
      "82o": {
        "Fold": 100
      },
      "76o": {
        "Fold": 100
      },
      "75o": {
        "Fold": 100
      },
      "74o": {
        "Fold": 100
      },
      "73o": {
        "Fold": 100
      },
      "72o": {
        "Fold": 100
      },
      "65o": {
        "Fold": 100
      },
      "64o": {
        "Fold": 100
      },
      "63o": {
        "Fold": 100
      },
      "62o": {
        "Fold": 100
      },
      "54o": {
        "Fold": 100
      },
      "53o": {
        "Fold": 100
      },
      "52o": {
        "Fold": 100
      },
      "43o": {
        "Fold": 100
      },
      "42o": {
        "Fold": 100
      },
      "32o": {
        "Fold": 100
      },
      "K9o": {
        "ALL-IN": 100
      },
      "K8o": {
        "ALL-IN": 100
      },
      "K7o": {
        "Fold": 100
      },
      "K6o": {
        "Fold": 100
      },
      "K5o": {
        "Fold": 100
      },
      "K4o": {
        "Fold": 100
      },
      "K3o": {
        "Fold": 100
      },
      "K2o": {
        "Fold": 100
      },
      "A6o": {
        "ALL-IN": 100
      },
      "A5o": {
        "ALL-IN": 100
      },
      "A4o": {
        "ALL-IN": 100
      },
      "A3o": {
        "ALL-IN": 100
      },
      "A2o": {
        "ALL-IN": 100
      },
      "J7o": {
        "Fold": 100
      },
      "K3s": {
        "Fold": 100
      },
      "QTo": {
        "ALL-IN": 100
      }
    },
    "customActions": [
      "Fold",
      "ALL-IN"
    ]
  },
  {
    "id": "sc-1770426983850",
    "name": "OPEN SHOVE - 5bb",
    "description": "",
    "videoLink": "",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "open shove",
    "playerCount": 9,
    "heroPos": "BTN",
    "opponents": [],
    "stackBB": 5,
    "heroBetSize": 2.5,
    "ranges": {
      "22": {
        "ALL-IN": 100
      },
      "33": {
        "ALL-IN": 100
      },
      "44": {
        "ALL-IN": 100
      },
      "55": {
        "ALL-IN": 100
      },
      "66": {
        "ALL-IN": 100
      },
      "77": {
        "ALL-IN": 100
      },
      "88": {
        "ALL-IN": 100
      },
      "99": {
        "ALL-IN": 100
      },
      "AA": {
        "ALL-IN": 100
      },
      "AKs": {
        "ALL-IN": 100
      },
      "AQs": {
        "ALL-IN": 100
      },
      "AJs": {
        "ALL-IN": 100
      },
      "ATs": {
        "ALL-IN": 100
      },
      "A9s": {
        "ALL-IN": 100
      },
      "A8s": {
        "ALL-IN": 100
      },
      "A7s": {
        "ALL-IN": 100
      },
      "A6s": {
        "ALL-IN": 100
      },
      "A5s": {
        "ALL-IN": 100
      },
      "A4s": {
        "ALL-IN": 100
      },
      "A3s": {
        "ALL-IN": 100
      },
      "A2s": {
        "ALL-IN": 100
      },
      "AKo": {
        "ALL-IN": 100
      },
      "KK": {
        "ALL-IN": 100
      },
      "KQs": {
        "ALL-IN": 100
      },
      "KJs": {
        "ALL-IN": 100
      },
      "KTs": {
        "ALL-IN": 100
      },
      "K9s": {
        "ALL-IN": 100
      },
      "K8s": {
        "ALL-IN": 100
      },
      "K7s": {
        "ALL-IN": 100
      },
      "K6s": {
        "ALL-IN": 100
      },
      "Q8s": {
        "ALL-IN": 100
      },
      "QTs": {
        "ALL-IN": 100
      },
      "Q9s": {
        "ALL-IN": 100
      },
      "T9s": {
        "ALL-IN": 100
      },
      "J9s": {
        "ALL-IN": 100
      },
      "JTs": {
        "ALL-IN": 100
      },
      "QJs": {
        "ALL-IN": 100
      },
      "QQ": {
        "ALL-IN": 100
      },
      "TT": {
        "ALL-IN": 100
      },
      "JJ": {
        "ALL-IN": 100
      },
      "T8s": {
        "ALL-IN": 100
      },
      "98s": {
        "ALL-IN": 100
      },
      "87s": {
        "Fold": 100
      },
      "A7o": {
        "ALL-IN": 100
      },
      "A8o": {
        "ALL-IN": 100
      },
      "A9o": {
        "ALL-IN": 100
      },
      "ATo": {
        "ALL-IN": 100
      },
      "AJo": {
        "ALL-IN": 100
      },
      "AQo": {
        "ALL-IN": 100
      },
      "KQo": {
        "ALL-IN": 100
      },
      "KJo": {
        "ALL-IN": 100
      },
      "KTo": {
        "ALL-IN": 100
      },
      "QJo": {
        "ALL-IN": 100
      },
      "K5s": {
        "ALL-IN": 100
      },
      "K4s": {
        "ALL-IN": 100
      },
      "K2s": {
        "ALL-IN": 100
      },
      "Q7s": {
        "ALL-IN": 100
      },
      "Q6s": {
        "ALL-IN": 100
      },
      "Q5s": {
        "ALL-IN": 100
      },
      "Q4s": {
        "Fold": 100
      },
      "Q3s": {
        "Fold": 100
      },
      "Q2s": {
        "Fold": 100
      },
      "J8s": {
        "ALL-IN": 100
      },
      "J7s": {
        "ALL-IN": 100
      },
      "J6s": {
        "Fold": 100
      },
      "J5s": {
        "Fold": 100
      },
      "J4s": {
        "Fold": 100
      },
      "J3s": {
        "Fold": 100
      },
      "J2s": {
        "Fold": 100
      },
      "T7s": {
        "Fold": 100
      },
      "T6s": {
        "Fold": 100
      },
      "T5s": {
        "Fold": 100
      },
      "T4s": {
        "Fold": 100
      },
      "T3s": {
        "Fold": 100
      },
      "T2s": {
        "Fold": 100
      },
      "97s": {
        "Fold": 100
      },
      "96s": {
        "Fold": 100
      },
      "95s": {
        "Fold": 100
      },
      "94s": {
        "Fold": 100
      },
      "93s": {
        "Fold": 100
      },
      "92s": {
        "Fold": 100
      },
      "86s": {
        "Fold": 100
      },
      "85s": {
        "Fold": 100
      },
      "84s": {
        "Fold": 100
      },
      "83s": {
        "Fold": 100
      },
      "82s": {
        "Fold": 100
      },
      "72s": {
        "Fold": 100
      },
      "73s": {
        "Fold": 100
      },
      "74s": {
        "Fold": 100
      },
      "75s": {
        "Fold": 100
      },
      "76s": {
        "Fold": 100
      },
      "65s": {
        "Fold": 100
      },
      "64s": {
        "Fold": 100
      },
      "63s": {
        "Fold": 100
      },
      "62s": {
        "Fold": 100
      },
      "54s": {
        "Fold": 100
      },
      "53s": {
        "Fold": 100
      },
      "52s": {
        "Fold": 100
      },
      "43s": {
        "Fold": 100
      },
      "42s": {
        "Fold": 100
      },
      "32s": {
        "Fold": 100
      },
      "Q9o": {
        "ALL-IN": 100
      },
      "Q8o": {
        "ALL-IN": 100
      },
      "Q7o": {
        "Fold": 100
      },
      "Q6o": {
        "Fold": 100
      },
      "Q5o": {
        "Fold": 100
      },
      "Q4o": {
        "Fold": 100
      },
      "Q3o": {
        "Fold": 100
      },
      "Q2o": {
        "Fold": 100
      },
      "J2o": {
        "Fold": 100
      },
      "J3o": {
        "Fold": 100
      },
      "J4o": {
        "Fold": 100
      },
      "J5o": {
        "Fold": 100
      },
      "J6o": {
        "Fold": 100
      },
      "J8o": {
        "Fold": 100
      },
      "J9o": {
        "ALL-IN": 100
      },
      "JTo": {
        "ALL-IN": 100
      },
      "T9o": {
        "Fold": 100
      },
      "T8o": {
        "Fold": 100
      },
      "T7o": {
        "Fold": 100
      },
      "T6o": {
        "Fold": 100
      },
      "T5o": {
        "Fold": 100
      },
      "T4o": {
        "Fold": 100
      },
      "T3o": {
        "Fold": 100
      },
      "T2o": {
        "Fold": 100
      },
      "98o": {
        "Fold": 100
      },
      "97o": {
        "Fold": 100
      },
      "96o": {
        "Fold": 100
      },
      "95o": {
        "Fold": 100
      },
      "94o": {
        "Fold": 100
      },
      "93o": {
        "Fold": 100
      },
      "92o": {
        "Fold": 100
      },
      "87o": {
        "Fold": 100
      },
      "86o": {
        "Fold": 100
      },
      "85o": {
        "Fold": 100
      },
      "84o": {
        "Fold": 100
      },
      "83o": {
        "Fold": 100
      },
      "82o": {
        "Fold": 100
      },
      "76o": {
        "Fold": 100
      },
      "75o": {
        "Fold": 100
      },
      "74o": {
        "Fold": 100
      },
      "73o": {
        "Fold": 100
      },
      "72o": {
        "Fold": 100
      },
      "65o": {
        "Fold": 100
      },
      "64o": {
        "Fold": 100
      },
      "63o": {
        "Fold": 100
      },
      "62o": {
        "Fold": 100
      },
      "54o": {
        "Fold": 100
      },
      "53o": {
        "Fold": 100
      },
      "52o": {
        "Fold": 100
      },
      "43o": {
        "Fold": 100
      },
      "42o": {
        "Fold": 100
      },
      "32o": {
        "Fold": 100
      },
      "K9o": {
        "ALL-IN": 100
      },
      "K8o": {
        "ALL-IN": 100
      },
      "K7o": {
        "ALL-IN": 100
      },
      "K6o": {
        "ALL-IN": 100
      },
      "K5o": {
        "ALL-IN": 100
      },
      "K4o": {
        "Fold": 100
      },
      "K3o": {
        "Fold": 100
      },
      "K2o": {
        "Fold": 100
      },
      "A6o": {
        "ALL-IN": 100
      },
      "A5o": {
        "ALL-IN": 100
      },
      "A4o": {
        "ALL-IN": 100
      },
      "A3o": {
        "ALL-IN": 100
      },
      "A2o": {
        "ALL-IN": 100
      },
      "J7o": {
        "Fold": 100
      },
      "K3s": {
        "ALL-IN": 100
      },
      "QTo": {
        "ALL-IN": 100
      }
    },
    "customActions": [
      "Fold",
      "ALL-IN"
    ]
  },
  {
    "id": "sc-1770427042804",
    "name": "OPEN SHOVE - 5bb",
    "description": "",
    "videoLink": "",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "open shove",
    "playerCount": 9,
    "heroPos": "SB",
    "opponents": [],
    "stackBB": 5,
    "heroBetSize": 2.5,
    "ranges": {
      "22": {
        "ALL-IN": 100
      },
      "33": {
        "ALL-IN": 100
      },
      "44": {
        "ALL-IN": 100
      },
      "55": {
        "ALL-IN": 100
      },
      "66": {
        "ALL-IN": 100
      },
      "77": {
        "ALL-IN": 100
      },
      "88": {
        "ALL-IN": 100
      },
      "99": {
        "ALL-IN": 100
      },
      "AA": {
        "ALL-IN": 100
      },
      "AKs": {
        "ALL-IN": 100
      },
      "AQs": {
        "ALL-IN": 100
      },
      "AJs": {
        "ALL-IN": 100
      },
      "ATs": {
        "ALL-IN": 100
      },
      "A9s": {
        "ALL-IN": 100
      },
      "A8s": {
        "ALL-IN": 100
      },
      "A7s": {
        "ALL-IN": 100
      },
      "A6s": {
        "ALL-IN": 100
      },
      "A5s": {
        "ALL-IN": 100
      },
      "A4s": {
        "ALL-IN": 100
      },
      "A3s": {
        "ALL-IN": 100
      },
      "A2s": {
        "ALL-IN": 100
      },
      "AKo": {
        "ALL-IN": 100
      },
      "KK": {
        "ALL-IN": 100
      },
      "KQs": {
        "ALL-IN": 100
      },
      "KJs": {
        "ALL-IN": 100
      },
      "KTs": {
        "ALL-IN": 100
      },
      "K9s": {
        "ALL-IN": 100
      },
      "K8s": {
        "ALL-IN": 100
      },
      "K7s": {
        "ALL-IN": 100
      },
      "K6s": {
        "ALL-IN": 100
      },
      "Q8s": {
        "ALL-IN": 100
      },
      "QTs": {
        "ALL-IN": 100
      },
      "Q9s": {
        "ALL-IN": 100
      },
      "T9s": {
        "ALL-IN": 100
      },
      "J9s": {
        "ALL-IN": 100
      },
      "JTs": {
        "ALL-IN": 100
      },
      "QJs": {
        "ALL-IN": 100
      },
      "QQ": {
        "ALL-IN": 100
      },
      "TT": {
        "ALL-IN": 100
      },
      "JJ": {
        "ALL-IN": 100
      },
      "T8s": {
        "ALL-IN": 100
      },
      "98s": {
        "ALL-IN": 100
      },
      "87s": {
        "ALL-IN": 100
      },
      "A7o": {
        "ALL-IN": 100
      },
      "A8o": {
        "ALL-IN": 100
      },
      "A9o": {
        "ALL-IN": 100
      },
      "ATo": {
        "ALL-IN": 100
      },
      "AJo": {
        "ALL-IN": 100
      },
      "AQo": {
        "ALL-IN": 100
      },
      "KQo": {
        "ALL-IN": 100
      },
      "KJo": {
        "ALL-IN": 100
      },
      "KTo": {
        "ALL-IN": 100
      },
      "QJo": {
        "ALL-IN": 100
      },
      "K5s": {
        "ALL-IN": 100
      },
      "K4s": {
        "ALL-IN": 100
      },
      "K2s": {
        "ALL-IN": 100
      },
      "Q7s": {
        "ALL-IN": 100
      },
      "Q6s": {
        "ALL-IN": 100
      },
      "Q5s": {
        "ALL-IN": 100
      },
      "Q4s": {
        "ALL-IN": 100
      },
      "Q3s": {
        "ALL-IN": 100
      },
      "Q2s": {
        "ALL-IN": 100
      },
      "J8s": {
        "ALL-IN": 100
      },
      "J7s": {
        "ALL-IN": 100
      },
      "J6s": {
        "ALL-IN": 100
      },
      "J5s": {
        "ALL-IN": 100
      },
      "J4s": {
        "ALL-IN": 100
      },
      "J3s": {
        "ALL-IN": 100
      },
      "J2s": {
        "ALL-IN": 100
      },
      "T7s": {
        "ALL-IN": 100
      },
      "T6s": {
        "ALL-IN": 100
      },
      "T5s": {
        "ALL-IN": 100
      },
      "T4s": {
        "ALL-IN": 100
      },
      "T3s": {
        "ALL-IN": 100
      },
      "T2s": {
        "ALL-IN": 100
      },
      "97s": {
        "ALL-IN": 100
      },
      "96s": {
        "ALL-IN": 100
      },
      "95s": {
        "ALL-IN": 100
      },
      "94s": {
        "Fold": 100
      },
      "93s": {
        "Fold": 100
      },
      "92s": {
        "Fold": 100
      },
      "86s": {
        "ALL-IN": 100
      },
      "85s": {
        "ALL-IN": 100
      },
      "84s": {
        "Fold": 100
      },
      "83s": {
        "Fold": 100
      },
      "82s": {
        "Fold": 100
      },
      "72s": {
        "Fold": 100
      },
      "73s": {
        "Fold": 100
      },
      "74s": {
        "Fold": 100
      },
      "75s": {
        "ALL-IN": 100
      },
      "76s": {
        "ALL-IN": 100
      },
      "65s": {
        "ALL-IN": 100
      },
      "64s": {
        "Fold": 100
      },
      "63s": {
        "Fold": 100
      },
      "62s": {
        "Fold": 100
      },
      "54s": {
        "Fold": 100
      },
      "53s": {
        "Fold": 100
      },
      "52s": {
        "Fold": 100
      },
      "43s": {
        "Fold": 100
      },
      "42s": {
        "Fold": 100
      },
      "32s": {
        "Fold": 100
      },
      "Q9o": {
        "ALL-IN": 100
      },
      "Q8o": {
        "ALL-IN": 100
      },
      "Q7o": {
        "ALL-IN": 100
      },
      "Q6o": {
        "ALL-IN": 100
      },
      "Q5o": {
        "ALL-IN": 100
      },
      "Q4o": {
        "ALL-IN": 100
      },
      "Q3o": {
        "ALL-IN": 100
      },
      "Q2o": {
        "ALL-IN": 100
      },
      "J2o": {
        "ALL-IN": 100
      },
      "J3o": {
        "ALL-IN": 100
      },
      "J4o": {
        "ALL-IN": 100
      },
      "J5o": {
        "ALL-IN": 100
      },
      "J6o": {
        "ALL-IN": 100
      },
      "J8o": {
        "ALL-IN": 100
      },
      "J9o": {
        "ALL-IN": 100
      },
      "JTo": {
        "ALL-IN": 100
      },
      "T9o": {
        "ALL-IN": 100
      },
      "T8o": {
        "ALL-IN": 100
      },
      "T7o": {
        "ALL-IN": 100
      },
      "T6o": {
        "ALL-IN": 100
      },
      "T5o": {
        "ALL-IN": 100
      },
      "T4o": {
        "Fold": 100
      },
      "T3o": {
        "Fold": 100
      },
      "T2o": {
        "Fold": 100
      },
      "98o": {
        "ALL-IN": 100
      },
      "97o": {
        "ALL-IN": 100
      },
      "96o": {
        "ALL-IN": 100
      },
      "95o": {
        "Fold": 100
      },
      "94o": {
        "Fold": 100
      },
      "93o": {
        "Fold": 100
      },
      "92o": {
        "Fold": 100
      },
      "87o": {
        "ALL-IN": 100
      },
      "86o": {
        "Fold": 100
      },
      "85o": {
        "Fold": 100
      },
      "84o": {
        "Fold": 100
      },
      "83o": {
        "Fold": 100
      },
      "82o": {
        "Fold": 100
      },
      "76o": {
        "Fold": 100
      },
      "75o": {
        "Fold": 100
      },
      "74o": {
        "Fold": 100
      },
      "73o": {
        "Fold": 100
      },
      "72o": {
        "Fold": 100
      },
      "65o": {
        "Fold": 100
      },
      "64o": {
        "Fold": 100
      },
      "63o": {
        "Fold": 100
      },
      "62o": {
        "Fold": 100
      },
      "54o": {
        "Fold": 100
      },
      "53o": {
        "Fold": 100
      },
      "52o": {
        "Fold": 100
      },
      "43o": {
        "Fold": 100
      },
      "42o": {
        "Fold": 100
      },
      "32o": {
        "Fold": 100
      },
      "K9o": {
        "ALL-IN": 100
      },
      "K8o": {
        "ALL-IN": 100
      },
      "K7o": {
        "ALL-IN": 100
      },
      "K6o": {
        "ALL-IN": 100
      },
      "K5o": {
        "ALL-IN": 100
      },
      "K4o": {
        "ALL-IN": 100
      },
      "K3o": {
        "ALL-IN": 100
      },
      "K2o": {
        "ALL-IN": 100
      },
      "A6o": {
        "ALL-IN": 100
      },
      "A5o": {
        "ALL-IN": 100
      },
      "A4o": {
        "ALL-IN": 100
      },
      "A3o": {
        "ALL-IN": 100
      },
      "A2o": {
        "ALL-IN": 100
      },
      "J7o": {
        "ALL-IN": 100
      },
      "K3s": {
        "ALL-IN": 100
      },
      "QTo": {
        "ALL-IN": 100
      }
    },
    "customActions": [
      "Fold",
      "ALL-IN"
    ]
  },
  {
    "id": "sc-1770430155528-0",
    "name": "OPEN SHOVE - 10BB",
    "description": "",
    "videoLink": "",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "open shove",
    "playerCount": 9,
    "heroPos": "UTG",
    "opponents": [],
    "stackBB": 10,
    "heroBetSize": 2.5,
    "ranges": {
      "22": {
        "Fold": 100
      },
      "33": {
        "Fold": 100
      },
      "44": {
        "Fold": 100
      },
      "55": {
        "Fold": 100
      },
      "66": {
        "Fold": 100
      },
      "77": {
        "Fold": 100
      },
      "88": {
        "ALL-IN": 100
      },
      "99": {
        "ALL-IN": 100
      },
      "AA": {
        "ALL-IN": 100
      },
      "AKs": {
        "ALL-IN": 100
      },
      "AQs": {
        "ALL-IN": 100
      },
      "AJs": {
        "ALL-IN": 100
      },
      "ATs": {
        "Fold": 100
      },
      "A9s": {
        "Fold": 100
      },
      "A8s": {
        "Fold": 100
      },
      "A7s": {
        "Fold": 100
      },
      "A6s": {
        "Fold": 100
      },
      "A5s": {
        "Fold": 100
      },
      "A4s": {
        "Fold": 100
      },
      "A3s": {
        "Fold": 100
      },
      "A2s": {
        "Fold": 100
      },
      "AKo": {
        "ALL-IN": 100
      },
      "KK": {
        "ALL-IN": 100
      },
      "KQs": {
        "Fold": 100
      },
      "KJs": {
        "Fold": 100
      },
      "KTs": {
        "Fold": 100
      },
      "K9s": {
        "Fold": 100
      },
      "K8s": {
        "Fold": 100
      },
      "K7s": {
        "Fold": 100
      },
      "K6s": {
        "Fold": 100
      },
      "Q8s": {
        "Fold": 100
      },
      "QTs": {
        "Fold": 100
      },
      "Q9s": {
        "Fold": 100
      },
      "T9s": {
        "Fold": 100
      },
      "J9s": {
        "Fold": 100
      },
      "JTs": {
        "Fold": 100
      },
      "QJs": {
        "Fold": 100
      },
      "QQ": {
        "ALL-IN": 100
      },
      "TT": {
        "ALL-IN": 100
      },
      "JJ": {
        "ALL-IN": 100
      },
      "T8s": {
        "Fold": 100
      },
      "98s": {
        "Fold": 100
      },
      "87s": {
        "Fold": 100
      },
      "A7o": {
        "Fold": 100
      },
      "A8o": {
        "Fold": 100
      },
      "A9o": {
        "Fold": 100
      },
      "ATo": {
        "Fold": 100
      },
      "AJo": {
        "Fold": 100
      },
      "AQo": {
        "ALL-IN": 100
      },
      "KQo": {
        "Fold": 100
      },
      "KJo": {
        "Fold": 100
      },
      "KTo": {
        "Fold": 100
      },
      "QJo": {
        "Fold": 100
      },
      "K5s": {
        "Fold": 100
      },
      "K4s": {
        "Fold": 100
      },
      "K3s": {
        "Fold": 100
      },
      "K2s": {
        "Fold": 100
      },
      "Q7s": {
        "Fold": 100
      },
      "Q6s": {
        "Fold": 100
      },
      "Q5s": {
        "Fold": 100
      },
      "Q4s": {
        "Fold": 100
      },
      "Q3s": {
        "Fold": 100
      },
      "Q2s": {
        "Fold": 100
      },
      "J8s": {
        "Fold": 100
      },
      "J7s": {
        "Fold": 100
      },
      "J6s": {
        "Fold": 100
      },
      "J5s": {
        "Fold": 100
      },
      "J4s": {
        "Fold": 100
      },
      "J3s": {
        "Fold": 100
      },
      "J2s": {
        "Fold": 100
      },
      "T7s": {
        "Fold": 100
      },
      "T6s": {
        "Fold": 100
      },
      "T5s": {
        "Fold": 100
      },
      "T4s": {
        "Fold": 100
      },
      "T3s": {
        "Fold": 100
      },
      "T2s": {
        "Fold": 100
      },
      "97s": {
        "Fold": 100
      },
      "96s": {
        "Fold": 100
      },
      "95s": {
        "Fold": 100
      },
      "94s": {
        "Fold": 100
      },
      "93s": {
        "Fold": 100
      },
      "92s": {
        "Fold": 100
      },
      "86s": {
        "Fold": 100
      },
      "85s": {
        "Fold": 100
      },
      "84s": {
        "Fold": 100
      },
      "83s": {
        "Fold": 100
      },
      "82s": {
        "Fold": 100
      },
      "72s": {
        "Fold": 100
      },
      "73s": {
        "Fold": 100
      },
      "74s": {
        "Fold": 100
      },
      "75s": {
        "Fold": 100
      },
      "76s": {
        "Fold": 100
      },
      "65s": {
        "Fold": 100
      },
      "64s": {
        "Fold": 100
      },
      "63s": {
        "Fold": 100
      },
      "62s": {
        "Fold": 100
      },
      "54s": {
        "Fold": 100
      },
      "53s": {
        "Fold": 100
      },
      "52s": {
        "Fold": 100
      },
      "43s": {
        "Fold": 100
      },
      "42s": {
        "Fold": 100
      },
      "32s": {
        "Fold": 100
      },
      "QTo": {
        "Fold": 100
      },
      "Q9o": {
        "Fold": 100
      },
      "Q8o": {
        "Fold": 100
      },
      "Q7o": {
        "Fold": 100
      },
      "Q6o": {
        "Fold": 100
      },
      "Q5o": {
        "Fold": 100
      },
      "Q4o": {
        "Fold": 100
      },
      "Q3o": {
        "Fold": 100
      },
      "Q2o": {
        "Fold": 100
      },
      "J2o": {
        "Fold": 100
      },
      "J3o": {
        "Fold": 100
      },
      "J4o": {
        "Fold": 100
      },
      "J5o": {
        "Fold": 100
      },
      "J6o": {
        "Fold": 100
      },
      "J7o": {
        "Fold": 100
      },
      "J8o": {
        "Fold": 100
      },
      "J9o": {
        "Fold": 100
      },
      "JTo": {
        "Fold": 100
      },
      "T9o": {
        "Fold": 100
      },
      "T8o": {
        "Fold": 100
      },
      "T7o": {
        "Fold": 100
      },
      "T6o": {
        "Fold": 100
      },
      "T5o": {
        "Fold": 100
      },
      "T4o": {
        "Fold": 100
      },
      "T3o": {
        "Fold": 100
      },
      "T2o": {
        "Fold": 100
      },
      "98o": {
        "Fold": 100
      },
      "97o": {
        "Fold": 100
      },
      "96o": {
        "Fold": 100
      },
      "95o": {
        "Fold": 100
      },
      "94o": {
        "Fold": 100
      },
      "93o": {
        "Fold": 100
      },
      "92o": {
        "Fold": 100
      },
      "87o": {
        "Fold": 100
      },
      "86o": {
        "Fold": 100
      },
      "85o": {
        "Fold": 100
      },
      "84o": {
        "Fold": 100
      },
      "83o": {
        "Fold": 100
      },
      "82o": {
        "Fold": 100
      },
      "76o": {
        "Fold": 100
      },
      "75o": {
        "Fold": 100
      },
      "74o": {
        "Fold": 100
      },
      "73o": {
        "Fold": 100
      },
      "72o": {
        "Fold": 100
      },
      "65o": {
        "Fold": 100
      },
      "64o": {
        "Fold": 100
      },
      "63o": {
        "Fold": 100
      },
      "62o": {
        "Fold": 100
      },
      "54o": {
        "Fold": 100
      },
      "53o": {
        "Fold": 100
      },
      "52o": {
        "Fold": 100
      },
      "43o": {
        "Fold": 100
      },
      "42o": {
        "Fold": 100
      },
      "32o": {
        "Fold": 100
      },
      "K9o": {
        "Fold": 100
      },
      "K8o": {
        "Fold": 100
      },
      "K7o": {
        "Fold": 100
      },
      "K6o": {
        "Fold": 100
      },
      "K5o": {
        "Fold": 100
      },
      "K4o": {
        "Fold": 100
      },
      "K3o": {
        "Fold": 100
      },
      "K2o": {
        "Fold": 100
      },
      "A6o": {
        "Fold": 100
      },
      "A5o": {
        "Fold": 100
      },
      "A4o": {
        "Fold": 100
      },
      "A3o": {
        "Fold": 100
      },
      "A2o": {
        "Fold": 100
      }
    },
    "customActions": [
      "Fold",
      "ALL-IN"
    ],
    "updatedAt": 1770433305085
  },
  {
    "id": "sc-1770430193772-1",
    "name": "OPEN SHOVE - 10BB",
    "description": "",
    "videoLink": "",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "open shove",
    "playerCount": 9,
    "heroPos": "UTG+1",
    "opponents": [],
    "stackBB": 10,
    "heroBetSize": 2.5,
    "ranges": {
      "22": {
        "Fold": 100
      },
      "33": {
        "Fold": 100
      },
      "44": {
        "Fold": 100
      },
      "55": {
        "Fold": 100
      },
      "66": {
        "Fold": 100
      },
      "77": {
        "ALL-IN": 100
      },
      "88": {
        "ALL-IN": 100
      },
      "99": {
        "ALL-IN": 100
      },
      "AA": {
        "ALL-IN": 100
      },
      "AKs": {
        "ALL-IN": 100
      },
      "AQs": {
        "ALL-IN": 100
      },
      "AJs": {
        "ALL-IN": 100
      },
      "ATs": {
        "Fold": 100
      },
      "A9s": {
        "Fold": 100
      },
      "A8s": {
        "Fold": 100
      },
      "A7s": {
        "Fold": 100
      },
      "A6s": {
        "Fold": 100
      },
      "A5s": {
        "Fold": 100
      },
      "A4s": {
        "Fold": 100
      },
      "A3s": {
        "Fold": 100
      },
      "A2s": {
        "Fold": 100
      },
      "AKo": {
        "ALL-IN": 100
      },
      "KK": {
        "ALL-IN": 100
      },
      "KQs": {
        "Fold": 100
      },
      "KJs": {
        "Fold": 100
      },
      "KTs": {
        "Fold": 100
      },
      "K9s": {
        "Fold": 100
      },
      "K8s": {
        "Fold": 100
      },
      "K7s": {
        "Fold": 100
      },
      "K6s": {
        "Fold": 100
      },
      "Q8s": {
        "Fold": 100
      },
      "QTs": {
        "Fold": 100
      },
      "Q9s": {
        "Fold": 100
      },
      "T9s": {
        "Fold": 100
      },
      "J9s": {
        "Fold": 100
      },
      "JTs": {
        "Fold": 100
      },
      "QJs": {
        "Fold": 100
      },
      "QQ": {
        "ALL-IN": 100
      },
      "TT": {
        "ALL-IN": 100
      },
      "JJ": {
        "ALL-IN": 100
      },
      "T8s": {
        "Fold": 100
      },
      "98s": {
        "Fold": 100
      },
      "87s": {
        "Fold": 100
      },
      "A7o": {
        "Fold": 100
      },
      "A8o": {
        "Fold": 100
      },
      "A9o": {
        "Fold": 100
      },
      "ATo": {
        "Fold": 100
      },
      "AJo": {
        "ALL-IN": 100
      },
      "AQo": {
        "ALL-IN": 100
      },
      "KQo": {
        "Fold": 100
      },
      "KJo": {
        "Fold": 100
      },
      "KTo": {
        "Fold": 100
      },
      "QJo": {
        "Fold": 100
      },
      "K5s": {
        "Fold": 100
      },
      "K4s": {
        "Fold": 100
      },
      "K3s": {
        "Fold": 100
      },
      "K2s": {
        "Fold": 100
      },
      "Q7s": {
        "Fold": 100
      },
      "Q6s": {
        "Fold": 100
      },
      "Q5s": {
        "Fold": 100
      },
      "Q4s": {
        "Fold": 100
      },
      "Q3s": {
        "Fold": 100
      },
      "Q2s": {
        "Fold": 100
      },
      "J8s": {
        "Fold": 100
      },
      "J7s": {
        "Fold": 100
      },
      "J6s": {
        "Fold": 100
      },
      "J5s": {
        "Fold": 100
      },
      "J4s": {
        "Fold": 100
      },
      "J3s": {
        "Fold": 100
      },
      "J2s": {
        "Fold": 100
      },
      "T7s": {
        "Fold": 100
      },
      "T6s": {
        "Fold": 100
      },
      "T5s": {
        "Fold": 100
      },
      "T4s": {
        "Fold": 100
      },
      "T3s": {
        "Fold": 100
      },
      "T2s": {
        "Fold": 100
      },
      "97s": {
        "Fold": 100
      },
      "96s": {
        "Fold": 100
      },
      "95s": {
        "Fold": 100
      },
      "94s": {
        "Fold": 100
      },
      "93s": {
        "Fold": 100
      },
      "92s": {
        "Fold": 100
      },
      "86s": {
        "Fold": 100
      },
      "85s": {
        "Fold": 100
      },
      "84s": {
        "Fold": 100
      },
      "83s": {
        "Fold": 100
      },
      "82s": {
        "Fold": 100
      },
      "72s": {
        "Fold": 100
      },
      "73s": {
        "Fold": 100
      },
      "74s": {
        "Fold": 100
      },
      "75s": {
        "Fold": 100
      },
      "76s": {
        "Fold": 100
      },
      "65s": {
        "Fold": 100
      },
      "64s": {
        "Fold": 100
      },
      "63s": {
        "Fold": 100
      },
      "62s": {
        "Fold": 100
      },
      "54s": {
        "Fold": 100
      },
      "53s": {
        "Fold": 100
      },
      "52s": {
        "Fold": 100
      },
      "43s": {
        "Fold": 100
      },
      "42s": {
        "Fold": 100
      },
      "32s": {
        "Fold": 100
      },
      "QTo": {
        "Fold": 100
      },
      "Q9o": {
        "Fold": 100
      },
      "Q8o": {
        "Fold": 100
      },
      "Q7o": {
        "Fold": 100
      },
      "Q6o": {
        "Fold": 100
      },
      "Q5o": {
        "Fold": 100
      },
      "Q4o": {
        "Fold": 100
      },
      "Q3o": {
        "Fold": 100
      },
      "Q2o": {
        "Fold": 100
      },
      "J2o": {
        "Fold": 100
      },
      "J3o": {
        "Fold": 100
      },
      "J4o": {
        "Fold": 100
      },
      "J5o": {
        "Fold": 100
      },
      "J6o": {
        "Fold": 100
      },
      "J8o": {
        "Fold": 100
      },
      "J9o": {
        "Fold": 100
      },
      "JTo": {
        "Fold": 100
      },
      "T9o": {
        "Fold": 100
      },
      "T8o": {
        "Fold": 100
      },
      "T7o": {
        "Fold": 100
      },
      "T6o": {
        "Fold": 100
      },
      "T5o": {
        "Fold": 100
      },
      "T4o": {
        "Fold": 100
      },
      "T3o": {
        "Fold": 100
      },
      "T2o": {
        "Fold": 100
      },
      "98o": {
        "Fold": 100
      },
      "97o": {
        "Fold": 100
      },
      "96o": {
        "Fold": 100
      },
      "95o": {
        "Fold": 100
      },
      "94o": {
        "Fold": 100
      },
      "93o": {
        "Fold": 100
      },
      "92o": {
        "Fold": 100
      },
      "87o": {
        "Fold": 100
      },
      "86o": {
        "Fold": 100
      },
      "85o": {
        "Fold": 100
      },
      "84o": {
        "Fold": 100
      },
      "83o": {
        "Fold": 100
      },
      "82o": {
        "Fold": 100
      },
      "76o": {
        "Fold": 100
      },
      "75o": {
        "Fold": 100
      },
      "74o": {
        "Fold": 100
      },
      "73o": {
        "Fold": 100
      },
      "72o": {
        "Fold": 100
      },
      "65o": {
        "Fold": 100
      },
      "64o": {
        "Fold": 100
      },
      "63o": {
        "Fold": 100
      },
      "62o": {
        "Fold": 100
      },
      "54o": {
        "Fold": 100
      },
      "53o": {
        "Fold": 100
      },
      "52o": {
        "Fold": 100
      },
      "43o": {
        "Fold": 100
      },
      "42o": {
        "Fold": 100
      },
      "32o": {
        "Fold": 100
      },
      "K9o": {
        "Fold": 100
      },
      "K8o": {
        "Fold": 100
      },
      "K7o": {
        "Fold": 100
      },
      "K6o": {
        "Fold": 100
      },
      "K5o": {
        "Fold": 100
      },
      "K4o": {
        "Fold": 100
      },
      "K3o": {
        "Fold": 100
      },
      "K2o": {
        "Fold": 100
      },
      "A6o": {
        "Fold": 100
      },
      "A5o": {
        "Fold": 100
      },
      "A4o": {
        "Fold": 100
      },
      "A3o": {
        "Fold": 100
      },
      "A2o": {
        "Fold": 100
      },
      "J7o": {
        "Fold": 100
      }
    },
    "customActions": [
      "Fold",
      "ALL-IN"
    ],
    "updatedAt": 1770433323961
  },
  {
    "id": "sc-1770430424166-2",
    "name": "OPEN SHOVE - 10BB",
    "description": "",
    "videoLink": "",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "open shove",
    "playerCount": 9,
    "heroPos": "MP",
    "opponents": [],
    "stackBB": 10,
    "heroBetSize": 2.5,
    "ranges": {
      "22": {
        "Fold": 100
      },
      "33": {
        "Fold": 100
      },
      "44": {
        "Fold": 100
      },
      "55": {
        "Fold": 100
      },
      "66": {
        "ALL-IN": 100
      },
      "77": {
        "ALL-IN": 100
      },
      "88": {
        "ALL-IN": 100
      },
      "99": {
        "ALL-IN": 100
      },
      "AA": {
        "ALL-IN": 100
      },
      "AKs": {
        "ALL-IN": 100
      },
      "AQs": {
        "ALL-IN": 100
      },
      "AJs": {
        "ALL-IN": 100
      },
      "ATs": {
        "ALL-IN": 100
      },
      "A9s": {
        "Fold": 100
      },
      "A8s": {
        "Fold": 100
      },
      "A7s": {
        "Fold": 100
      },
      "A6s": {
        "Fold": 100
      },
      "A5s": {
        "Fold": 100
      },
      "A4s": {
        "Fold": 100
      },
      "A3s": {
        "Fold": 100
      },
      "A2s": {
        "Fold": 100
      },
      "AKo": {
        "ALL-IN": 100
      },
      "KK": {
        "ALL-IN": 100
      },
      "KQs": {
        "Fold": 100
      },
      "KJs": {
        "Fold": 100
      },
      "KTs": {
        "Fold": 100
      },
      "K9s": {
        "Fold": 100
      },
      "K8s": {
        "Fold": 100
      },
      "K7s": {
        "Fold": 100
      },
      "K6s": {
        "Fold": 100
      },
      "Q8s": {
        "Fold": 100
      },
      "QTs": {
        "Fold": 100
      },
      "Q9s": {
        "Fold": 100
      },
      "T9s": {
        "Fold": 100
      },
      "J9s": {
        "Fold": 100
      },
      "JTs": {
        "Fold": 100
      },
      "QJs": {
        "Fold": 100
      },
      "QQ": {
        "ALL-IN": 100
      },
      "TT": {
        "ALL-IN": 100
      },
      "JJ": {
        "ALL-IN": 100
      },
      "T8s": {
        "Fold": 100
      },
      "98s": {
        "Fold": 100
      },
      "87s": {
        "Fold": 100
      },
      "A7o": {
        "Fold": 100
      },
      "A8o": {
        "Fold": 100
      },
      "A9o": {
        "Fold": 100
      },
      "ATo": {
        "Fold": 100
      },
      "AJo": {
        "ALL-IN": 100
      },
      "AQo": {
        "ALL-IN": 100
      },
      "KQo": {
        "Fold": 100
      },
      "KJo": {
        "Fold": 100
      },
      "KTo": {
        "Fold": 100
      },
      "QJo": {
        "Fold": 100
      },
      "K5s": {
        "Fold": 100
      },
      "K4s": {
        "Fold": 100
      },
      "K2s": {
        "Fold": 100
      },
      "Q7s": {
        "Fold": 100
      },
      "Q6s": {
        "Fold": 100
      },
      "Q5s": {
        "Fold": 100
      },
      "Q4s": {
        "Fold": 100
      },
      "Q3s": {
        "Fold": 100
      },
      "Q2s": {
        "Fold": 100
      },
      "J8s": {
        "Fold": 100
      },
      "J7s": {
        "Fold": 100
      },
      "J6s": {
        "Fold": 100
      },
      "J5s": {
        "Fold": 100
      },
      "J4s": {
        "Fold": 100
      },
      "J3s": {
        "Fold": 100
      },
      "J2s": {
        "Fold": 100
      },
      "T7s": {
        "Fold": 100
      },
      "T6s": {
        "Fold": 100
      },
      "T5s": {
        "Fold": 100
      },
      "T4s": {
        "Fold": 100
      },
      "T3s": {
        "Fold": 100
      },
      "T2s": {
        "Fold": 100
      },
      "97s": {
        "Fold": 100
      },
      "96s": {
        "Fold": 100
      },
      "95s": {
        "Fold": 100
      },
      "94s": {
        "Fold": 100
      },
      "93s": {
        "Fold": 100
      },
      "92s": {
        "Fold": 100
      },
      "86s": {
        "Fold": 100
      },
      "85s": {
        "Fold": 100
      },
      "84s": {
        "Fold": 100
      },
      "83s": {
        "Fold": 100
      },
      "82s": {
        "Fold": 100
      },
      "72s": {
        "Fold": 100
      },
      "73s": {
        "Fold": 100
      },
      "74s": {
        "Fold": 100
      },
      "75s": {
        "Fold": 100
      },
      "76s": {
        "Fold": 100
      },
      "65s": {
        "Fold": 100
      },
      "64s": {
        "Fold": 100
      },
      "63s": {
        "Fold": 100
      },
      "62s": {
        "Fold": 100
      },
      "54s": {
        "Fold": 100
      },
      "53s": {
        "Fold": 100
      },
      "52s": {
        "Fold": 100
      },
      "43s": {
        "Fold": 100
      },
      "42s": {
        "Fold": 100
      },
      "32s": {
        "Fold": 100
      },
      "Q9o": {
        "Fold": 100
      },
      "Q8o": {
        "Fold": 100
      },
      "Q7o": {
        "Fold": 100
      },
      "Q6o": {
        "Fold": 100
      },
      "Q5o": {
        "Fold": 100
      },
      "Q4o": {
        "Fold": 100
      },
      "Q3o": {
        "Fold": 100
      },
      "Q2o": {
        "Fold": 100
      },
      "J2o": {
        "Fold": 100
      },
      "J3o": {
        "Fold": 100
      },
      "J4o": {
        "Fold": 100
      },
      "J5o": {
        "Fold": 100
      },
      "J6o": {
        "Fold": 100
      },
      "J8o": {
        "Fold": 100
      },
      "J9o": {
        "Fold": 100
      },
      "JTo": {
        "Fold": 100
      },
      "T9o": {
        "Fold": 100
      },
      "T8o": {
        "Fold": 100
      },
      "T7o": {
        "Fold": 100
      },
      "T6o": {
        "Fold": 100
      },
      "T5o": {
        "Fold": 100
      },
      "T4o": {
        "Fold": 100
      },
      "T3o": {
        "Fold": 100
      },
      "T2o": {
        "Fold": 100
      },
      "98o": {
        "Fold": 100
      },
      "97o": {
        "Fold": 100
      },
      "96o": {
        "Fold": 100
      },
      "95o": {
        "Fold": 100
      },
      "94o": {
        "Fold": 100
      },
      "93o": {
        "Fold": 100
      },
      "92o": {
        "Fold": 100
      },
      "87o": {
        "Fold": 100
      },
      "86o": {
        "Fold": 100
      },
      "85o": {
        "Fold": 100
      },
      "84o": {
        "Fold": 100
      },
      "83o": {
        "Fold": 100
      },
      "82o": {
        "Fold": 100
      },
      "76o": {
        "Fold": 100
      },
      "75o": {
        "Fold": 100
      },
      "74o": {
        "Fold": 100
      },
      "73o": {
        "Fold": 100
      },
      "72o": {
        "Fold": 100
      },
      "65o": {
        "Fold": 100
      },
      "64o": {
        "Fold": 100
      },
      "63o": {
        "Fold": 100
      },
      "62o": {
        "Fold": 100
      },
      "54o": {
        "Fold": 100
      },
      "53o": {
        "Fold": 100
      },
      "52o": {
        "Fold": 100
      },
      "43o": {
        "Fold": 100
      },
      "42o": {
        "Fold": 100
      },
      "32o": {
        "Fold": 100
      },
      "K9o": {
        "Fold": 100
      },
      "K8o": {
        "Fold": 100
      },
      "K7o": {
        "Fold": 100
      },
      "K6o": {
        "Fold": 100
      },
      "K5o": {
        "Fold": 100
      },
      "K4o": {
        "Fold": 100
      },
      "K3o": {
        "Fold": 100
      },
      "K2o": {
        "Fold": 100
      },
      "A6o": {
        "Fold": 100
      },
      "A5o": {
        "Fold": 100
      },
      "A4o": {
        "Fold": 100
      },
      "A3o": {
        "Fold": 100
      },
      "A2o": {
        "Fold": 100
      },
      "J7o": {
        "Fold": 100
      },
      "K3s": {
        "Fold": 100
      },
      "QTo": {
        "Fold": 100
      }
    },
    "customActions": [
      "Fold",
      "ALL-IN"
    ],
    "updatedAt": 1770433334951
  },
  {
    "id": "sc-1770430441272-3",
    "name": "OPEN SHOVE - 10BB",
    "description": "",
    "videoLink": "",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "open shove",
    "playerCount": 9,
    "heroPos": "LJ",
    "opponents": [],
    "stackBB": 10,
    "heroBetSize": 2.5,
    "ranges": {
      "22": {
        "Fold": 100
      },
      "33": {
        "Fold": 100
      },
      "44": {
        "Fold": 100
      },
      "55": {
        "ALL-IN": 100
      },
      "66": {
        "ALL-IN": 100
      },
      "77": {
        "ALL-IN": 100
      },
      "88": {
        "ALL-IN": 100
      },
      "99": {
        "ALL-IN": 100
      },
      "AA": {
        "ALL-IN": 100
      },
      "AKs": {
        "ALL-IN": 100
      },
      "AQs": {
        "ALL-IN": 100
      },
      "AJs": {
        "ALL-IN": 100
      },
      "ATs": {
        "ALL-IN": 100
      },
      "A9s": {
        "ALL-IN": 100
      },
      "A8s": {
        "ALL-IN": 100
      },
      "A7s": {
        "Fold": 100
      },
      "A6s": {
        "Fold": 100
      },
      "A5s": {
        "Fold": 100
      },
      "A4s": {
        "Fold": 100
      },
      "A3s": {
        "Fold": 100
      },
      "A2s": {
        "Fold": 100
      },
      "AKo": {
        "ALL-IN": 100
      },
      "KK": {
        "ALL-IN": 100
      },
      "KQs": {
        "ALL-IN": 100
      },
      "KJs": {
        "Fold": 100
      },
      "KTs": {
        "Fold": 100
      },
      "K9s": {
        "Fold": 100
      },
      "K8s": {
        "Fold": 100
      },
      "K7s": {
        "Fold": 100
      },
      "K6s": {
        "Fold": 100
      },
      "Q8s": {
        "Fold": 100
      },
      "QTs": {
        "Fold": 100
      },
      "Q9s": {
        "Fold": 100
      },
      "T9s": {
        "Fold": 100
      },
      "J9s": {
        "Fold": 100
      },
      "JTs": {
        "Fold": 100
      },
      "QJs": {
        "Fold": 100
      },
      "QQ": {
        "ALL-IN": 100
      },
      "TT": {
        "ALL-IN": 100
      },
      "JJ": {
        "ALL-IN": 100
      },
      "T8s": {
        "Fold": 100
      },
      "98s": {
        "Fold": 100
      },
      "87s": {
        "Fold": 100
      },
      "A7o": {
        "Fold": 100
      },
      "A8o": {
        "Fold": 100
      },
      "A9o": {
        "Fold": 100
      },
      "ATo": {
        "Fold": 100
      },
      "AJo": {
        "ALL-IN": 100
      },
      "AQo": {
        "ALL-IN": 100
      },
      "KQo": {
        "Fold": 100
      },
      "KJo": {
        "Fold": 100
      },
      "KTo": {
        "Fold": 100
      },
      "QJo": {
        "Fold": 100
      },
      "K5s": {
        "Fold": 100
      },
      "K4s": {
        "Fold": 100
      },
      "K2s": {
        "Fold": 100
      },
      "Q7s": {
        "Fold": 100
      },
      "Q6s": {
        "Fold": 100
      },
      "Q5s": {
        "Fold": 100
      },
      "Q4s": {
        "Fold": 100
      },
      "Q3s": {
        "Fold": 100
      },
      "Q2s": {
        "Fold": 100
      },
      "J8s": {
        "Fold": 100
      },
      "J7s": {
        "Fold": 100
      },
      "J6s": {
        "Fold": 100
      },
      "J5s": {
        "Fold": 100
      },
      "J4s": {
        "Fold": 100
      },
      "J3s": {
        "Fold": 100
      },
      "J2s": {
        "Fold": 100
      },
      "T7s": {
        "Fold": 100
      },
      "T6s": {
        "Fold": 100
      },
      "T5s": {
        "Fold": 100
      },
      "T4s": {
        "Fold": 100
      },
      "T3s": {
        "Fold": 100
      },
      "T2s": {
        "Fold": 100
      },
      "97s": {
        "Fold": 100
      },
      "96s": {
        "Fold": 100
      },
      "95s": {
        "Fold": 100
      },
      "94s": {
        "Fold": 100
      },
      "93s": {
        "Fold": 100
      },
      "92s": {
        "Fold": 100
      },
      "86s": {
        "Fold": 100
      },
      "85s": {
        "Fold": 100
      },
      "84s": {
        "Fold": 100
      },
      "83s": {
        "Fold": 100
      },
      "82s": {
        "Fold": 100
      },
      "72s": {
        "Fold": 100
      },
      "73s": {
        "Fold": 100
      },
      "74s": {
        "Fold": 100
      },
      "75s": {
        "Fold": 100
      },
      "76s": {
        "Fold": 100
      },
      "65s": {
        "Fold": 100
      },
      "64s": {
        "Fold": 100
      },
      "63s": {
        "Fold": 100
      },
      "62s": {
        "Fold": 100
      },
      "54s": {
        "Fold": 100
      },
      "53s": {
        "Fold": 100
      },
      "52s": {
        "Fold": 100
      },
      "43s": {
        "Fold": 100
      },
      "42s": {
        "Fold": 100
      },
      "32s": {
        "Fold": 100
      },
      "Q9o": {
        "Fold": 100
      },
      "Q8o": {
        "Fold": 100
      },
      "Q7o": {
        "Fold": 100
      },
      "Q6o": {
        "Fold": 100
      },
      "Q5o": {
        "Fold": 100
      },
      "Q4o": {
        "Fold": 100
      },
      "Q3o": {
        "Fold": 100
      },
      "Q2o": {
        "Fold": 100
      },
      "J2o": {
        "Fold": 100
      },
      "J3o": {
        "Fold": 100
      },
      "J4o": {
        "Fold": 100
      },
      "J5o": {
        "Fold": 100
      },
      "J6o": {
        "Fold": 100
      },
      "J8o": {
        "Fold": 100
      },
      "J9o": {
        "Fold": 100
      },
      "JTo": {
        "Fold": 100
      },
      "T9o": {
        "Fold": 100
      },
      "T8o": {
        "Fold": 100
      },
      "T7o": {
        "Fold": 100
      },
      "T6o": {
        "Fold": 100
      },
      "T5o": {
        "Fold": 100
      },
      "T4o": {
        "Fold": 100
      },
      "T3o": {
        "Fold": 100
      },
      "T2o": {
        "Fold": 100
      },
      "98o": {
        "Fold": 100
      },
      "97o": {
        "Fold": 100
      },
      "96o": {
        "Fold": 100
      },
      "95o": {
        "Fold": 100
      },
      "94o": {
        "Fold": 100
      },
      "93o": {
        "Fold": 100
      },
      "92o": {
        "Fold": 100
      },
      "87o": {
        "Fold": 100
      },
      "86o": {
        "Fold": 100
      },
      "85o": {
        "Fold": 100
      },
      "84o": {
        "Fold": 100
      },
      "83o": {
        "Fold": 100
      },
      "82o": {
        "Fold": 100
      },
      "76o": {
        "Fold": 100
      },
      "75o": {
        "Fold": 100
      },
      "74o": {
        "Fold": 100
      },
      "73o": {
        "Fold": 100
      },
      "72o": {
        "Fold": 100
      },
      "65o": {
        "Fold": 100
      },
      "64o": {
        "Fold": 100
      },
      "63o": {
        "Fold": 100
      },
      "62o": {
        "Fold": 100
      },
      "54o": {
        "Fold": 100
      },
      "53o": {
        "Fold": 100
      },
      "52o": {
        "Fold": 100
      },
      "43o": {
        "Fold": 100
      },
      "42o": {
        "Fold": 100
      },
      "32o": {
        "Fold": 100
      },
      "K9o": {
        "Fold": 100
      },
      "K8o": {
        "Fold": 100
      },
      "K7o": {
        "Fold": 100
      },
      "K6o": {
        "Fold": 100
      },
      "K5o": {
        "Fold": 100
      },
      "K4o": {
        "Fold": 100
      },
      "K3o": {
        "Fold": 100
      },
      "K2o": {
        "Fold": 100
      },
      "A6o": {
        "Fold": 100
      },
      "A5o": {
        "Fold": 100
      },
      "A4o": {
        "Fold": 100
      },
      "A3o": {
        "Fold": 100
      },
      "A2o": {
        "Fold": 100
      },
      "J7o": {
        "Fold": 100
      },
      "K3s": {
        "Fold": 100
      },
      "QTo": {
        "Fold": 100
      }
    },
    "customActions": [
      "Fold",
      "ALL-IN"
    ],
    "updatedAt": 1770433346953
  },
  {
    "id": "sc-1770430462310-4",
    "name": "OPEN SHOVE - 10BB",
    "description": "",
    "videoLink": "",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "open shove",
    "playerCount": 9,
    "heroPos": "HJ",
    "opponents": [],
    "stackBB": 10,
    "heroBetSize": 2.5,
    "ranges": {
      "22": {
        "Fold": 100
      },
      "33": {
        "Fold": 100
      },
      "44": {
        "ALL-IN": 100
      },
      "55": {
        "ALL-IN": 100
      },
      "66": {
        "ALL-IN": 100
      },
      "77": {
        "ALL-IN": 100
      },
      "88": {
        "ALL-IN": 100
      },
      "99": {
        "ALL-IN": 100
      },
      "AA": {
        "ALL-IN": 100
      },
      "AKs": {
        "ALL-IN": 100
      },
      "AQs": {
        "ALL-IN": 100
      },
      "AJs": {
        "ALL-IN": 100
      },
      "ATs": {
        "ALL-IN": 100
      },
      "A9s": {
        "ALL-IN": 100
      },
      "A8s": {
        "ALL-IN": 100
      },
      "A7s": {
        "Fold": 100
      },
      "A6s": {
        "Fold": 100
      },
      "A5s": {
        "Fold": 100
      },
      "A4s": {
        "Fold": 100
      },
      "A3s": {
        "Fold": 100
      },
      "A2s": {
        "Fold": 100
      },
      "AKo": {
        "ALL-IN": 100
      },
      "KK": {
        "ALL-IN": 100
      },
      "KQs": {
        "ALL-IN": 100
      },
      "KJs": {
        "Fold": 100
      },
      "KTs": {
        "Fold": 100
      },
      "K9s": {
        "Fold": 100
      },
      "K8s": {
        "Fold": 100
      },
      "K7s": {
        "Fold": 100
      },
      "K6s": {
        "Fold": 100
      },
      "Q8s": {
        "Fold": 100
      },
      "QTs": {
        "Fold": 100
      },
      "Q9s": {
        "Fold": 100
      },
      "T9s": {
        "Fold": 100
      },
      "J9s": {
        "Fold": 100
      },
      "JTs": {
        "Fold": 100
      },
      "QJs": {
        "Fold": 100
      },
      "QQ": {
        "ALL-IN": 100
      },
      "TT": {
        "ALL-IN": 100
      },
      "JJ": {
        "ALL-IN": 100
      },
      "T8s": {
        "Fold": 100
      },
      "98s": {
        "Fold": 100
      },
      "87s": {
        "Fold": 100
      },
      "A7o": {
        "Fold": 100
      },
      "A8o": {
        "Fold": 100
      },
      "A9o": {
        "ALL-IN": 100
      },
      "ATo": {
        "ALL-IN": 100
      },
      "AJo": {
        "ALL-IN": 100
      },
      "AQo": {
        "ALL-IN": 100
      },
      "KQo": {
        "Fold": 100
      },
      "KJo": {
        "Fold": 100
      },
      "KTo": {
        "Fold": 100
      },
      "QJo": {
        "Fold": 100
      },
      "K5s": {
        "Fold": 100
      },
      "K4s": {
        "Fold": 100
      },
      "K2s": {
        "Fold": 100
      },
      "Q7s": {
        "Fold": 100
      },
      "Q6s": {
        "Fold": 100
      },
      "Q5s": {
        "Fold": 100
      },
      "Q4s": {
        "Fold": 100
      },
      "Q3s": {
        "Fold": 100
      },
      "Q2s": {
        "Fold": 100
      },
      "J8s": {
        "Fold": 100
      },
      "J7s": {
        "Fold": 100
      },
      "J6s": {
        "Fold": 100
      },
      "J5s": {
        "Fold": 100
      },
      "J4s": {
        "Fold": 100
      },
      "J3s": {
        "Fold": 100
      },
      "J2s": {
        "Fold": 100
      },
      "T7s": {
        "Fold": 100
      },
      "T6s": {
        "Fold": 100
      },
      "T5s": {
        "Fold": 100
      },
      "T4s": {
        "Fold": 100
      },
      "T3s": {
        "Fold": 100
      },
      "T2s": {
        "Fold": 100
      },
      "97s": {
        "Fold": 100
      },
      "96s": {
        "Fold": 100
      },
      "95s": {
        "Fold": 100
      },
      "94s": {
        "Fold": 100
      },
      "93s": {
        "Fold": 100
      },
      "92s": {
        "Fold": 100
      },
      "86s": {
        "Fold": 100
      },
      "85s": {
        "Fold": 100
      },
      "84s": {
        "Fold": 100
      },
      "83s": {
        "Fold": 100
      },
      "82s": {
        "Fold": 100
      },
      "72s": {
        "Fold": 100
      },
      "73s": {
        "Fold": 100
      },
      "74s": {
        "Fold": 100
      },
      "75s": {
        "Fold": 100
      },
      "76s": {
        "Fold": 100
      },
      "65s": {
        "Fold": 100
      },
      "64s": {
        "Fold": 100
      },
      "63s": {
        "Fold": 100
      },
      "62s": {
        "Fold": 100
      },
      "54s": {
        "Fold": 100
      },
      "53s": {
        "Fold": 100
      },
      "52s": {
        "Fold": 100
      },
      "43s": {
        "Fold": 100
      },
      "42s": {
        "Fold": 100
      },
      "32s": {
        "Fold": 100
      },
      "Q9o": {
        "Fold": 100
      },
      "Q8o": {
        "Fold": 100
      },
      "Q7o": {
        "Fold": 100
      },
      "Q6o": {
        "Fold": 100
      },
      "Q5o": {
        "Fold": 100
      },
      "Q4o": {
        "Fold": 100
      },
      "Q3o": {
        "Fold": 100
      },
      "Q2o": {
        "Fold": 100
      },
      "J2o": {
        "Fold": 100
      },
      "J3o": {
        "Fold": 100
      },
      "J4o": {
        "Fold": 100
      },
      "J5o": {
        "Fold": 100
      },
      "J6o": {
        "Fold": 100
      },
      "J8o": {
        "Fold": 100
      },
      "J9o": {
        "Fold": 100
      },
      "JTo": {
        "Fold": 100
      },
      "T9o": {
        "Fold": 100
      },
      "T8o": {
        "Fold": 100
      },
      "T7o": {
        "Fold": 100
      },
      "T6o": {
        "Fold": 100
      },
      "T5o": {
        "Fold": 100
      },
      "T4o": {
        "Fold": 100
      },
      "T3o": {
        "Fold": 100
      },
      "T2o": {
        "Fold": 100
      },
      "98o": {
        "Fold": 100
      },
      "97o": {
        "Fold": 100
      },
      "96o": {
        "Fold": 100
      },
      "95o": {
        "Fold": 100
      },
      "94o": {
        "Fold": 100
      },
      "93o": {
        "Fold": 100
      },
      "92o": {
        "Fold": 100
      },
      "87o": {
        "Fold": 100
      },
      "86o": {
        "Fold": 100
      },
      "85o": {
        "Fold": 100
      },
      "84o": {
        "Fold": 100
      },
      "83o": {
        "Fold": 100
      },
      "82o": {
        "Fold": 100
      },
      "76o": {
        "Fold": 100
      },
      "75o": {
        "Fold": 100
      },
      "74o": {
        "Fold": 100
      },
      "73o": {
        "Fold": 100
      },
      "72o": {
        "Fold": 100
      },
      "65o": {
        "Fold": 100
      },
      "64o": {
        "Fold": 100
      },
      "63o": {
        "Fold": 100
      },
      "62o": {
        "Fold": 100
      },
      "54o": {
        "Fold": 100
      },
      "53o": {
        "Fold": 100
      },
      "52o": {
        "Fold": 100
      },
      "43o": {
        "Fold": 100
      },
      "42o": {
        "Fold": 100
      },
      "32o": {
        "Fold": 100
      },
      "K9o": {
        "Fold": 100
      },
      "K8o": {
        "Fold": 100
      },
      "K7o": {
        "Fold": 100
      },
      "K6o": {
        "Fold": 100
      },
      "K5o": {
        "Fold": 100
      },
      "K4o": {
        "Fold": 100
      },
      "K3o": {
        "Fold": 100
      },
      "K2o": {
        "Fold": 100
      },
      "A6o": {
        "Fold": 100
      },
      "A5o": {
        "Fold": 100
      },
      "A4o": {
        "Fold": 100
      },
      "A3o": {
        "Fold": 100
      },
      "A2o": {
        "Fold": 100
      },
      "J7o": {
        "Fold": 100
      },
      "K3s": {
        "Fold": 100
      },
      "QTo": {
        "Fold": 100
      }
    },
    "customActions": [
      "Fold",
      "ALL-IN"
    ],
    "updatedAt": 1770433366088
  },
  {
    "id": "sc-1770430489504-5",
    "name": "OPEN SHOVE - 10BB",
    "description": "",
    "videoLink": "",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "open shove",
    "playerCount": 9,
    "heroPos": "CO",
    "opponents": [],
    "stackBB": 10,
    "heroBetSize": 2.5,
    "ranges": {
      "22": {
        "Fold": 100
      },
      "33": {
        "ALL-IN": 100
      },
      "44": {
        "ALL-IN": 100
      },
      "55": {
        "ALL-IN": 100
      },
      "66": {
        "ALL-IN": 100
      },
      "77": {
        "ALL-IN": 100
      },
      "88": {
        "ALL-IN": 100
      },
      "99": {
        "ALL-IN": 100
      },
      "AA": {
        "ALL-IN": 100
      },
      "AKs": {
        "ALL-IN": 100
      },
      "AQs": {
        "ALL-IN": 100
      },
      "AJs": {
        "ALL-IN": 100
      },
      "ATs": {
        "ALL-IN": 100
      },
      "A9s": {
        "ALL-IN": 100
      },
      "A8s": {
        "ALL-IN": 100
      },
      "A7s": {
        "ALL-IN": 100
      },
      "A6s": {
        "ALL-IN": 100
      },
      "A5s": {
        "ALL-IN": 100
      },
      "A4s": {
        "ALL-IN": 100
      },
      "A3s": {
        "Fold": 100
      },
      "A2s": {
        "Fold": 100
      },
      "AKo": {
        "ALL-IN": 100
      },
      "KK": {
        "ALL-IN": 100
      },
      "KQs": {
        "ALL-IN": 100
      },
      "KJs": {
        "ALL-IN": 100
      },
      "KTs": {
        "ALL-IN": 100
      },
      "K9s": {
        "Fold": 100
      },
      "K8s": {
        "Fold": 100
      },
      "K7s": {
        "Fold": 100
      },
      "K6s": {
        "Fold": 100
      },
      "Q8s": {
        "Fold": 100
      },
      "QTs": {
        "Fold": 100
      },
      "Q9s": {
        "Fold": 100
      },
      "T9s": {
        "Fold": 100
      },
      "J9s": {
        "Fold": 100
      },
      "JTs": {
        "Fold": 100
      },
      "QJs": {
        "Fold": 100
      },
      "QQ": {
        "ALL-IN": 100
      },
      "TT": {
        "ALL-IN": 100
      },
      "JJ": {
        "ALL-IN": 100
      },
      "T8s": {
        "Fold": 100
      },
      "98s": {
        "Fold": 100
      },
      "87s": {
        "Fold": 100
      },
      "A7o": {
        "Fold": 100
      },
      "A8o": {
        "ALL-IN": 100
      },
      "A9o": {
        "ALL-IN": 100
      },
      "ATo": {
        "ALL-IN": 100
      },
      "AJo": {
        "ALL-IN": 100
      },
      "AQo": {
        "ALL-IN": 100
      },
      "KQo": {
        "ALL-IN": 100
      },
      "KJo": {
        "Fold": 100
      },
      "KTo": {
        "Fold": 100
      },
      "QJo": {
        "ALL-IN": 100
      },
      "K5s": {
        "Fold": 100
      },
      "K4s": {
        "Fold": 100
      },
      "K2s": {
        "Fold": 100
      },
      "Q7s": {
        "Fold": 100
      },
      "Q6s": {
        "Fold": 100
      },
      "Q5s": {
        "Fold": 100
      },
      "Q4s": {
        "Fold": 100
      },
      "Q3s": {
        "Fold": 100
      },
      "Q2s": {
        "Fold": 100
      },
      "J8s": {
        "Fold": 100
      },
      "J7s": {
        "Fold": 100
      },
      "J6s": {
        "Fold": 100
      },
      "J5s": {
        "Fold": 100
      },
      "J4s": {
        "Fold": 100
      },
      "J3s": {
        "Fold": 100
      },
      "J2s": {
        "Fold": 100
      },
      "T7s": {
        "Fold": 100
      },
      "T6s": {
        "Fold": 100
      },
      "T5s": {
        "Fold": 100
      },
      "T4s": {
        "Fold": 100
      },
      "T3s": {
        "Fold": 100
      },
      "T2s": {
        "Fold": 100
      },
      "97s": {
        "Fold": 100
      },
      "96s": {
        "Fold": 100
      },
      "95s": {
        "Fold": 100
      },
      "94s": {
        "Fold": 100
      },
      "93s": {
        "Fold": 100
      },
      "92s": {
        "Fold": 100
      },
      "86s": {
        "Fold": 100
      },
      "85s": {
        "Fold": 100
      },
      "84s": {
        "Fold": 100
      },
      "83s": {
        "Fold": 100
      },
      "82s": {
        "Fold": 100
      },
      "72s": {
        "Fold": 100
      },
      "73s": {
        "Fold": 100
      },
      "74s": {
        "Fold": 100
      },
      "75s": {
        "Fold": 100
      },
      "76s": {
        "Fold": 100
      },
      "65s": {
        "Fold": 100
      },
      "64s": {
        "Fold": 100
      },
      "63s": {
        "Fold": 100
      },
      "62s": {
        "Fold": 100
      },
      "54s": {
        "Fold": 100
      },
      "53s": {
        "Fold": 100
      },
      "52s": {
        "Fold": 100
      },
      "43s": {
        "Fold": 100
      },
      "42s": {
        "Fold": 100
      },
      "32s": {
        "Fold": 100
      },
      "Q9o": {
        "Fold": 100
      },
      "Q8o": {
        "Fold": 100
      },
      "Q7o": {
        "Fold": 100
      },
      "Q6o": {
        "Fold": 100
      },
      "Q5o": {
        "Fold": 100
      },
      "Q4o": {
        "Fold": 100
      },
      "Q3o": {
        "Fold": 100
      },
      "Q2o": {
        "Fold": 100
      },
      "J2o": {
        "Fold": 100
      },
      "J3o": {
        "Fold": 100
      },
      "J4o": {
        "Fold": 100
      },
      "J5o": {
        "Fold": 100
      },
      "J6o": {
        "Fold": 100
      },
      "J8o": {
        "Fold": 100
      },
      "J9o": {
        "Fold": 100
      },
      "JTo": {
        "ALL-IN": 100
      },
      "T9o": {
        "Fold": 100
      },
      "T8o": {
        "Fold": 100
      },
      "T7o": {
        "Fold": 100
      },
      "T6o": {
        "Fold": 100
      },
      "T5o": {
        "Fold": 100
      },
      "T4o": {
        "Fold": 100
      },
      "T3o": {
        "Fold": 100
      },
      "T2o": {
        "Fold": 100
      },
      "98o": {
        "Fold": 100
      },
      "97o": {
        "Fold": 100
      },
      "96o": {
        "Fold": 100
      },
      "95o": {
        "Fold": 100
      },
      "94o": {
        "Fold": 100
      },
      "93o": {
        "Fold": 100
      },
      "92o": {
        "Fold": 100
      },
      "87o": {
        "Fold": 100
      },
      "86o": {
        "Fold": 100
      },
      "85o": {
        "Fold": 100
      },
      "84o": {
        "Fold": 100
      },
      "83o": {
        "Fold": 100
      },
      "82o": {
        "Fold": 100
      },
      "76o": {
        "Fold": 100
      },
      "75o": {
        "Fold": 100
      },
      "74o": {
        "Fold": 100
      },
      "73o": {
        "Fold": 100
      },
      "72o": {
        "Fold": 100
      },
      "65o": {
        "Fold": 100
      },
      "64o": {
        "Fold": 100
      },
      "63o": {
        "Fold": 100
      },
      "62o": {
        "Fold": 100
      },
      "54o": {
        "Fold": 100
      },
      "53o": {
        "Fold": 100
      },
      "52o": {
        "Fold": 100
      },
      "43o": {
        "Fold": 100
      },
      "42o": {
        "Fold": 100
      },
      "32o": {
        "Fold": 100
      },
      "K9o": {
        "Fold": 100
      },
      "K8o": {
        "Fold": 100
      },
      "K7o": {
        "Fold": 100
      },
      "K6o": {
        "Fold": 100
      },
      "K5o": {
        "Fold": 100
      },
      "K4o": {
        "Fold": 100
      },
      "K3o": {
        "Fold": 100
      },
      "K2o": {
        "Fold": 100
      },
      "A6o": {
        "Fold": 100
      },
      "A5o": {
        "Fold": 100
      },
      "A4o": {
        "Fold": 100
      },
      "A3o": {
        "Fold": 100
      },
      "A2o": {
        "Fold": 100
      },
      "J7o": {
        "Fold": 100
      },
      "K3s": {
        "Fold": 100
      },
      "QTo": {
        "Fold": 100
      }
    },
    "customActions": [
      "Fold",
      "ALL-IN"
    ],
    "updatedAt": 1770433375734
  },
  {
    "id": "sc-1770430518019-6",
    "name": "OPEN SHOVE - 10BB",
    "description": "",
    "videoLink": "",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "open shove",
    "playerCount": 9,
    "heroPos": "BTN",
    "opponents": [],
    "stackBB": 10,
    "heroBetSize": 2.5,
    "ranges": {
      "22": {
        "ALL-IN": 100
      },
      "33": {
        "ALL-IN": 100
      },
      "44": {
        "ALL-IN": 100
      },
      "55": {
        "ALL-IN": 100
      },
      "66": {
        "ALL-IN": 100
      },
      "77": {
        "ALL-IN": 100
      },
      "88": {
        "ALL-IN": 100
      },
      "99": {
        "ALL-IN": 100
      },
      "AA": {
        "ALL-IN": 100
      },
      "AKs": {
        "ALL-IN": 100
      },
      "AQs": {
        "ALL-IN": 100
      },
      "AJs": {
        "ALL-IN": 100
      },
      "ATs": {
        "ALL-IN": 100
      },
      "A9s": {
        "ALL-IN": 100
      },
      "A8s": {
        "ALL-IN": 100
      },
      "A7s": {
        "ALL-IN": 100
      },
      "A6s": {
        "ALL-IN": 100
      },
      "A5s": {
        "ALL-IN": 100
      },
      "A4s": {
        "ALL-IN": 100
      },
      "A3s": {
        "ALL-IN": 100
      },
      "A2s": {
        "ALL-IN": 100
      },
      "AKo": {
        "ALL-IN": 100
      },
      "KK": {
        "ALL-IN": 100
      },
      "KQs": {
        "ALL-IN": 100
      },
      "KJs": {
        "ALL-IN": 100
      },
      "KTs": {
        "ALL-IN": 100
      },
      "K9s": {
        "ALL-IN": 100
      },
      "K8s": {
        "Fold": 100
      },
      "K7s": {
        "Fold": 100
      },
      "K6s": {
        "Fold": 100
      },
      "Q8s": {
        "Fold": 100
      },
      "QTs": {
        "ALL-IN": 100
      },
      "Q9s": {
        "Fold": 100
      },
      "T9s": {
        "Fold": 100
      },
      "J9s": {
        "Fold": 100
      },
      "JTs": {
        "Fold": 100
      },
      "QJs": {
        "ALL-IN": 100
      },
      "QQ": {
        "ALL-IN": 100
      },
      "TT": {
        "ALL-IN": 100
      },
      "JJ": {
        "ALL-IN": 100
      },
      "T8s": {
        "Fold": 100
      },
      "98s": {
        "Fold": 100
      },
      "87s": {
        "Fold": 100
      },
      "A7o": {
        "ALL-IN": 100
      },
      "A8o": {
        "ALL-IN": 100
      },
      "A9o": {
        "ALL-IN": 100
      },
      "ATo": {
        "ALL-IN": 100
      },
      "AJo": {
        "ALL-IN": 100
      },
      "AQo": {
        "ALL-IN": 100
      },
      "KQo": {
        "ALL-IN": 100
      },
      "KJo": {
        "ALL-IN": 100
      },
      "KTo": {
        "ALL-IN": 100
      },
      "QJo": {
        "Fold": 100
      },
      "K5s": {
        "Fold": 100
      },
      "K4s": {
        "Fold": 100
      },
      "K2s": {
        "Fold": 100
      },
      "Q7s": {
        "Fold": 100
      },
      "Q6s": {
        "Fold": 100
      },
      "Q5s": {
        "Fold": 100
      },
      "Q4s": {
        "Fold": 100
      },
      "Q3s": {
        "Fold": 100
      },
      "Q2s": {
        "Fold": 100
      },
      "J8s": {
        "Fold": 100
      },
      "J7s": {
        "Fold": 100
      },
      "J6s": {
        "Fold": 100
      },
      "J5s": {
        "Fold": 100
      },
      "J4s": {
        "Fold": 100
      },
      "J3s": {
        "Fold": 100
      },
      "J2s": {
        "Fold": 100
      },
      "T7s": {
        "Fold": 100
      },
      "T6s": {
        "Fold": 100
      },
      "T5s": {
        "Fold": 100
      },
      "T4s": {
        "Fold": 100
      },
      "T3s": {
        "Fold": 100
      },
      "T2s": {
        "Fold": 100
      },
      "97s": {
        "Fold": 100
      },
      "96s": {
        "Fold": 100
      },
      "95s": {
        "Fold": 100
      },
      "94s": {
        "Fold": 100
      },
      "93s": {
        "Fold": 100
      },
      "92s": {
        "Fold": 100
      },
      "86s": {
        "Fold": 100
      },
      "85s": {
        "Fold": 100
      },
      "84s": {
        "Fold": 100
      },
      "83s": {
        "Fold": 100
      },
      "82s": {
        "Fold": 100
      },
      "72s": {
        "Fold": 100
      },
      "73s": {
        "Fold": 100
      },
      "74s": {
        "Fold": 100
      },
      "75s": {
        "Fold": 100
      },
      "76s": {
        "Fold": 100
      },
      "65s": {
        "Fold": 100
      },
      "64s": {
        "Fold": 100
      },
      "63s": {
        "Fold": 100
      },
      "62s": {
        "Fold": 100
      },
      "54s": {
        "Fold": 100
      },
      "53s": {
        "Fold": 100
      },
      "52s": {
        "Fold": 100
      },
      "43s": {
        "Fold": 100
      },
      "42s": {
        "Fold": 100
      },
      "32s": {
        "Fold": 100
      },
      "Q9o": {
        "Fold": 100
      },
      "Q8o": {
        "Fold": 100
      },
      "Q7o": {
        "Fold": 100
      },
      "Q6o": {
        "Fold": 100
      },
      "Q5o": {
        "Fold": 100
      },
      "Q4o": {
        "Fold": 100
      },
      "Q3o": {
        "Fold": 100
      },
      "Q2o": {
        "Fold": 100
      },
      "J2o": {
        "Fold": 100
      },
      "J3o": {
        "Fold": 100
      },
      "J4o": {
        "Fold": 100
      },
      "J5o": {
        "Fold": 100
      },
      "J6o": {
        "Fold": 100
      },
      "J8o": {
        "Fold": 100
      },
      "J9o": {
        "Fold": 100
      },
      "JTo": {
        "Fold": 100
      },
      "T9o": {
        "Fold": 100
      },
      "T8o": {
        "Fold": 100
      },
      "T7o": {
        "Fold": 100
      },
      "T6o": {
        "Fold": 100
      },
      "T5o": {
        "Fold": 100
      },
      "T4o": {
        "Fold": 100
      },
      "T3o": {
        "Fold": 100
      },
      "T2o": {
        "Fold": 100
      },
      "98o": {
        "Fold": 100
      },
      "97o": {
        "Fold": 100
      },
      "96o": {
        "Fold": 100
      },
      "95o": {
        "Fold": 100
      },
      "94o": {
        "Fold": 100
      },
      "93o": {
        "Fold": 100
      },
      "92o": {
        "Fold": 100
      },
      "87o": {
        "Fold": 100
      },
      "86o": {
        "Fold": 100
      },
      "85o": {
        "Fold": 100
      },
      "84o": {
        "Fold": 100
      },
      "83o": {
        "Fold": 100
      },
      "82o": {
        "Fold": 100
      },
      "76o": {
        "Fold": 100
      },
      "75o": {
        "Fold": 100
      },
      "74o": {
        "Fold": 100
      },
      "73o": {
        "Fold": 100
      },
      "72o": {
        "Fold": 100
      },
      "65o": {
        "Fold": 100
      },
      "64o": {
        "Fold": 100
      },
      "63o": {
        "Fold": 100
      },
      "62o": {
        "Fold": 100
      },
      "54o": {
        "Fold": 100
      },
      "53o": {
        "Fold": 100
      },
      "52o": {
        "Fold": 100
      },
      "43o": {
        "Fold": 100
      },
      "42o": {
        "Fold": 100
      },
      "32o": {
        "Fold": 100
      },
      "K9o": {
        "Fold": 100
      },
      "K8o": {
        "Fold": 100
      },
      "K7o": {
        "Fold": 100
      },
      "K6o": {
        "Fold": 100
      },
      "K5o": {
        "Fold": 100
      },
      "K4o": {
        "Fold": 100
      },
      "K3o": {
        "Fold": 100
      },
      "K2o": {
        "Fold": 100
      },
      "A6o": {
        "ALL-IN": 100
      },
      "A5o": {
        "ALL-IN": 100
      },
      "A4o": {
        "ALL-IN": 100
      },
      "A3o": {
        "ALL-IN": 100
      },
      "A2o": {
        "Fold": 100
      },
      "J7o": {
        "Fold": 100
      },
      "K3s": {
        "Fold": 100
      },
      "QTo": {
        "Fold": 100
      }
    },
    "customActions": [
      "Fold",
      "ALL-IN"
    ],
    "updatedAt": 1770433385768
  },
  {
    "id": "sc-1770430550009-7",
    "name": "OPEN SHOVE - 10BB",
    "description": "",
    "videoLink": "",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "open shove",
    "playerCount": 9,
    "heroPos": "SB",
    "opponents": [],
    "stackBB": 10,
    "heroBetSize": 2.5,
    "ranges": {
      "22": {
        "ALL-IN": 100
      },
      "33": {
        "ALL-IN": 100
      },
      "44": {
        "ALL-IN": 100
      },
      "55": {
        "ALL-IN": 100
      },
      "66": {
        "ALL-IN": 100
      },
      "77": {
        "ALL-IN": 100
      },
      "88": {
        "ALL-IN": 100
      },
      "99": {
        "ALL-IN": 100
      },
      "AA": {
        "ALL-IN": 100
      },
      "AKs": {
        "ALL-IN": 100
      },
      "AQs": {
        "ALL-IN": 100
      },
      "AJs": {
        "ALL-IN": 100
      },
      "ATs": {
        "ALL-IN": 100
      },
      "A9s": {
        "ALL-IN": 100
      },
      "A8s": {
        "ALL-IN": 100
      },
      "A7s": {
        "ALL-IN": 100
      },
      "A6s": {
        "ALL-IN": 100
      },
      "A5s": {
        "ALL-IN": 100
      },
      "A4s": {
        "ALL-IN": 100
      },
      "A3s": {
        "ALL-IN": 100
      },
      "A2s": {
        "ALL-IN": 100
      },
      "AKo": {
        "ALL-IN": 100
      },
      "KK": {
        "ALL-IN": 100
      },
      "KQs": {
        "ALL-IN": 100
      },
      "KJs": {
        "ALL-IN": 100
      },
      "KTs": {
        "ALL-IN": 100
      },
      "K9s": {
        "ALL-IN": 100
      },
      "K8s": {
        "ALL-IN": 100
      },
      "K7s": {
        "ALL-IN": 100
      },
      "K6s": {
        "ALL-IN": 100
      },
      "Q8s": {
        "ALL-IN": 100
      },
      "QTs": {
        "ALL-IN": 100
      },
      "Q9s": {
        "ALL-IN": 100
      },
      "T9s": {
        "ALL-IN": 100
      },
      "J9s": {
        "ALL-IN": 100
      },
      "JTs": {
        "ALL-IN": 100
      },
      "QJs": {
        "ALL-IN": 100
      },
      "QQ": {
        "ALL-IN": 100
      },
      "TT": {
        "ALL-IN": 100
      },
      "JJ": {
        "ALL-IN": 100
      },
      "T8s": {
        "Fold": 100
      },
      "98s": {
        "Fold": 100
      },
      "87s": {
        "Fold": 100
      },
      "A7o": {
        "ALL-IN": 100
      },
      "A8o": {
        "ALL-IN": 100
      },
      "A9o": {
        "ALL-IN": 100
      },
      "ATo": {
        "ALL-IN": 100
      },
      "AJo": {
        "ALL-IN": 100
      },
      "AQo": {
        "ALL-IN": 100
      },
      "KQo": {
        "ALL-IN": 100
      },
      "KJo": {
        "ALL-IN": 100
      },
      "KTo": {
        "ALL-IN": 100
      },
      "QJo": {
        "ALL-IN": 100
      },
      "K5s": {
        "ALL-IN": 100
      },
      "K4s": {
        "ALL-IN": 100
      },
      "K2s": {
        "ALL-IN": 100
      },
      "Q7s": {
        "ALL-IN": 100
      },
      "Q6s": {
        "ALL-IN": 100
      },
      "Q5s": {
        "ALL-IN": 100
      },
      "Q4s": {
        "Fold": 100
      },
      "Q3s": {
        "Fold": 100
      },
      "Q2s": {
        "Fold": 100
      },
      "J8s": {
        "ALL-IN": 100
      },
      "J7s": {
        "Fold": 100
      },
      "J6s": {
        "Fold": 100
      },
      "J5s": {
        "Fold": 100
      },
      "J4s": {
        "Fold": 100
      },
      "J3s": {
        "Fold": 100
      },
      "J2s": {
        "Fold": 100
      },
      "T7s": {
        "Fold": 100
      },
      "T6s": {
        "Fold": 100
      },
      "T5s": {
        "Fold": 100
      },
      "T4s": {
        "Fold": 100
      },
      "T3s": {
        "Fold": 100
      },
      "T2s": {
        "Fold": 100
      },
      "97s": {
        "Fold": 100
      },
      "96s": {
        "Fold": 100
      },
      "95s": {
        "Fold": 100
      },
      "94s": {
        "Fold": 100
      },
      "93s": {
        "Fold": 100
      },
      "92s": {
        "Fold": 100
      },
      "86s": {
        "Fold": 100
      },
      "85s": {
        "Fold": 100
      },
      "84s": {
        "Fold": 100
      },
      "83s": {
        "Fold": 100
      },
      "82s": {
        "Fold": 100
      },
      "72s": {
        "Fold": 100
      },
      "73s": {
        "Fold": 100
      },
      "74s": {
        "Fold": 100
      },
      "75s": {
        "Fold": 100
      },
      "76s": {
        "Fold": 100
      },
      "65s": {
        "Fold": 100
      },
      "64s": {
        "Fold": 100
      },
      "63s": {
        "Fold": 100
      },
      "62s": {
        "Fold": 100
      },
      "54s": {
        "Fold": 100
      },
      "53s": {
        "Fold": 100
      },
      "52s": {
        "Fold": 100
      },
      "43s": {
        "Fold": 100
      },
      "42s": {
        "Fold": 100
      },
      "32s": {
        "Fold": 100
      },
      "Q9o": {
        "ALL-IN": 100
      },
      "Q8o": {
        "ALL-IN": 100
      },
      "Q7o": {
        "Fold": 100
      },
      "Q6o": {
        "Fold": 100
      },
      "Q5o": {
        "Fold": 100
      },
      "Q4o": {
        "Fold": 100
      },
      "Q3o": {
        "Fold": 100
      },
      "Q2o": {
        "Fold": 100
      },
      "J2o": {
        "Fold": 100
      },
      "J3o": {
        "Fold": 100
      },
      "J4o": {
        "Fold": 100
      },
      "J5o": {
        "Fold": 100
      },
      "J6o": {
        "Fold": 100
      },
      "J8o": {
        "Fold": 100
      },
      "J9o": {
        "ALL-IN": 100
      },
      "JTo": {
        "ALL-IN": 100
      },
      "T9o": {
        "Fold": 100
      },
      "T8o": {
        "Fold": 100
      },
      "T7o": {
        "Fold": 100
      },
      "T6o": {
        "Fold": 100
      },
      "T5o": {
        "Fold": 100
      },
      "T4o": {
        "Fold": 100
      },
      "T3o": {
        "Fold": 100
      },
      "T2o": {
        "Fold": 100
      },
      "98o": {
        "Fold": 100
      },
      "97o": {
        "Fold": 100
      },
      "96o": {
        "Fold": 100
      },
      "95o": {
        "Fold": 100
      },
      "94o": {
        "Fold": 100
      },
      "93o": {
        "Fold": 100
      },
      "92o": {
        "Fold": 100
      },
      "87o": {
        "Fold": 100
      },
      "86o": {
        "Fold": 100
      },
      "85o": {
        "Fold": 100
      },
      "84o": {
        "Fold": 100
      },
      "83o": {
        "Fold": 100
      },
      "82o": {
        "Fold": 100
      },
      "76o": {
        "Fold": 100
      },
      "75o": {
        "Fold": 100
      },
      "74o": {
        "Fold": 100
      },
      "73o": {
        "Fold": 100
      },
      "72o": {
        "Fold": 100
      },
      "65o": {
        "Fold": 100
      },
      "64o": {
        "Fold": 100
      },
      "63o": {
        "Fold": 100
      },
      "62o": {
        "Fold": 100
      },
      "54o": {
        "Fold": 100
      },
      "53o": {
        "Fold": 100
      },
      "52o": {
        "Fold": 100
      },
      "43o": {
        "Fold": 100
      },
      "42o": {
        "Fold": 100
      },
      "32o": {
        "Fold": 100
      },
      "K9o": {
        "ALL-IN": 100
      },
      "K8o": {
        "ALL-IN": 100
      },
      "K7o": {
        "ALL-IN": 100
      },
      "K6o": {
        "ALL-IN": 100
      },
      "K5o": {
        "ALL-IN": 100
      },
      "K4o": {
        "ALL-IN": 100
      },
      "K3o": {
        "ALL-IN": 100
      },
      "K2o": {
        "ALL-IN": 100
      },
      "A6o": {
        "ALL-IN": 100
      },
      "A5o": {
        "ALL-IN": 100
      },
      "A4o": {
        "ALL-IN": 100
      },
      "A3o": {
        "ALL-IN": 100
      },
      "A2o": {
        "ALL-IN": 100
      },
      "J7o": {
        "Fold": 100
      },
      "K3s": {
        "ALL-IN": 100
      },
      "QTo": {
        "ALL-IN": 100
      }
    },
    "customActions": [
      "Fold",
      "ALL-IN"
    ],
    "updatedAt": 1770433407194
  },
  {
    "id": "SC-CVUVAGG-0",
    "name": "OPEN SHOVE - 4bb",
    "description": "",
    "videoLink": "",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "open shove",
    "playerCount": 9,
    "heroPos": "UTG",
    "opponents": [],
    "stackBB": 20,
    "heroBetSize": 2.5,
    "ranges": {
      "22": {
        "Fold": 100
      },
      "33": {
        "Fold": 100
      },
      "44": {
        "ALL-IN": 100
      },
      "55": {
        "ALL-IN": 100
      },
      "66": {
        "ALL-IN": 100
      },
      "77": {
        "ALL-IN": 100
      },
      "88": {
        "ALL-IN": 100
      },
      "99": {
        "ALL-IN": 100
      },
      "AA": {
        "ALL-IN": 100
      },
      "AKs": {
        "ALL-IN": 100
      },
      "AQs": {
        "ALL-IN": 100
      },
      "AJs": {
        "ALL-IN": 100
      },
      "ATs": {
        "ALL-IN": 100
      },
      "A9s": {
        "ALL-IN": 100
      },
      "A8s": {
        "ALL-IN": 100
      },
      "A7s": {
        "ALL-IN": 100
      },
      "A6s": {
        "ALL-IN": 100
      },
      "A5s": {
        "ALL-IN": 100
      },
      "A4s": {
        "ALL-IN": 100
      },
      "A3s": {
        "Fold": 100
      },
      "A2s": {
        "Fold": 100
      },
      "AKo": {
        "ALL-IN": 100
      },
      "KK": {
        "ALL-IN": 100
      },
      "KQs": {
        "ALL-IN": 100
      },
      "KJs": {
        "ALL-IN": 100
      },
      "KTs": {
        "ALL-IN": 100
      },
      "K9s": {
        "Fold": 100
      },
      "K8s": {
        "Fold": 100
      },
      "K7s": {
        "Fold": 100
      },
      "K6s": {
        "Fold": 100
      },
      "Q8s": {
        "Fold": 100
      },
      "QTs": {
        "ALL-IN": 100
      },
      "Q9s": {
        "Fold": 100
      },
      "T9s": {
        "Fold": 100
      },
      "J9s": {
        "Fold": 100
      },
      "JTs": {
        "ALL-IN": 100
      },
      "QJs": {
        "ALL-IN": 100
      },
      "QQ": {
        "ALL-IN": 100
      },
      "TT": {
        "ALL-IN": 100
      },
      "JJ": {
        "ALL-IN": 100
      },
      "T8s": {
        "Fold": 100
      },
      "98s": {
        "Fold": 100
      },
      "87s": {
        "Fold": 100
      },
      "A7o": {
        "Fold": 100
      },
      "A8o": {
        "Fold": 100
      },
      "A9o": {
        "ALL-IN": 100
      },
      "ATo": {
        "ALL-IN": 100
      },
      "AJo": {
        "ALL-IN": 100
      },
      "AQo": {
        "ALL-IN": 100
      },
      "KQo": {
        "ALL-IN": 100
      },
      "KJo": {
        "ALL-IN": 100
      },
      "KTo": {
        "Fold": 100
      },
      "QJo": {
        "Fold": 100
      },
      "K5s": {
        "Fold": 100
      },
      "K4s": {
        "Fold": 100
      },
      "K3s": {
        "Fold": 100
      },
      "K2s": {
        "Fold": 100
      },
      "Q7s": {
        "Fold": 100
      },
      "Q6s": {
        "Fold": 100
      },
      "Q5s": {
        "Fold": 100
      },
      "Q4s": {
        "Fold": 100
      },
      "Q3s": {
        "Fold": 100
      },
      "Q2s": {
        "Fold": 100
      },
      "J8s": {
        "Fold": 100
      },
      "J7s": {
        "Fold": 100
      },
      "J6s": {
        "Fold": 100
      },
      "J5s": {
        "Fold": 100
      },
      "J4s": {
        "Fold": 100
      },
      "J3s": {
        "Fold": 100
      },
      "J2s": {
        "Fold": 100
      },
      "T7s": {
        "Fold": 100
      },
      "T6s": {
        "Fold": 100
      },
      "T5s": {
        "Fold": 100
      },
      "T4s": {
        "Fold": 100
      },
      "T3s": {
        "Fold": 100
      },
      "T2s": {
        "Fold": 100
      },
      "97s": {
        "Fold": 100
      },
      "96s": {
        "Fold": 100
      },
      "95s": {
        "Fold": 100
      },
      "94s": {
        "Fold": 100
      },
      "93s": {
        "Fold": 100
      },
      "92s": {
        "Fold": 100
      },
      "86s": {
        "Fold": 100
      },
      "85s": {
        "Fold": 100
      },
      "84s": {
        "Fold": 100
      },
      "83s": {
        "Fold": 100
      },
      "82s": {
        "Fold": 100
      },
      "72s": {
        "Fold": 100
      },
      "73s": {
        "Fold": 100
      },
      "74s": {
        "Fold": 100
      },
      "75s": {
        "Fold": 100
      },
      "76s": {
        "Fold": 100
      },
      "65s": {
        "Fold": 100
      },
      "64s": {
        "Fold": 100
      },
      "63s": {
        "Fold": 100
      },
      "62s": {
        "Fold": 100
      },
      "54s": {
        "Fold": 100
      },
      "53s": {
        "Fold": 100
      },
      "52s": {
        "Fold": 100
      },
      "43s": {
        "Fold": 100
      },
      "42s": {
        "Fold": 100
      },
      "32s": {
        "Fold": 100
      },
      "QTo": {
        "Fold": 100
      },
      "Q9o": {
        "Fold": 100
      },
      "Q8o": {
        "Fold": 100
      },
      "Q7o": {
        "Fold": 100
      },
      "Q6o": {
        "Fold": 100
      },
      "Q5o": {
        "Fold": 100
      },
      "Q4o": {
        "Fold": 100
      },
      "Q3o": {
        "Fold": 100
      },
      "Q2o": {
        "Fold": 100
      },
      "J2o": {
        "Fold": 100
      },
      "J3o": {
        "Fold": 100
      },
      "J4o": {
        "Fold": 100
      },
      "J5o": {
        "Fold": 100
      },
      "J6o": {
        "Fold": 100
      },
      "J7o": {
        "Fold": 100
      },
      "J8o": {
        "Fold": 100
      },
      "J9o": {
        "Fold": 100
      },
      "JTo": {
        "Fold": 100
      },
      "T9o": {
        "Fold": 100
      },
      "T8o": {
        "Fold": 100
      },
      "T7o": {
        "Fold": 100
      },
      "T6o": {
        "Fold": 100
      },
      "T5o": {
        "Fold": 100
      },
      "T4o": {
        "Fold": 100
      },
      "T3o": {
        "Fold": 100
      },
      "T2o": {
        "Fold": 100
      },
      "98o": {
        "Fold": 100
      },
      "97o": {
        "Fold": 100
      },
      "96o": {
        "Fold": 100
      },
      "95o": {
        "Fold": 100
      },
      "94o": {
        "Fold": 100
      },
      "93o": {
        "Fold": 100
      },
      "92o": {
        "Fold": 100
      },
      "87o": {
        "Fold": 100
      },
      "86o": {
        "Fold": 100
      },
      "85o": {
        "Fold": 100
      },
      "84o": {
        "Fold": 100
      },
      "83o": {
        "Fold": 100
      },
      "82o": {
        "Fold": 100
      },
      "76o": {
        "Fold": 100
      },
      "75o": {
        "Fold": 100
      },
      "74o": {
        "Fold": 100
      },
      "73o": {
        "Fold": 100
      },
      "72o": {
        "Fold": 100
      },
      "65o": {
        "Fold": 100
      },
      "64o": {
        "Fold": 100
      },
      "63o": {
        "Fold": 100
      },
      "62o": {
        "Fold": 100
      },
      "54o": {
        "Fold": 100
      },
      "53o": {
        "Fold": 100
      },
      "52o": {
        "Fold": 100
      },
      "43o": {
        "Fold": 100
      },
      "42o": {
        "Fold": 100
      },
      "32o": {
        "Fold": 100
      },
      "K9o": {
        "Fold": 100
      },
      "K8o": {
        "Fold": 100
      },
      "K7o": {
        "Fold": 100
      },
      "K6o": {
        "Fold": 100
      },
      "K5o": {
        "Fold": 100
      },
      "K4o": {
        "Fold": 100
      },
      "K3o": {
        "Fold": 100
      },
      "K2o": {
        "Fold": 100
      },
      "A6o": {
        "Fold": 100
      },
      "A5o": {
        "Fold": 100
      },
      "A4o": {
        "Fold": 100
      },
      "A3o": {
        "Fold": 100
      },
      "A2o": {
        "Fold": 100
      }
    },
    "customActions": [
      "Fold",
      "ALL-IN"
    ],
    "updatedAt": 1770433679606
  },
  {
    "id": "SC-0XTKZWH-1",
    "name": "OPEN SHOVE - 4bb",
    "description": "",
    "videoLink": "",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "open shove",
    "playerCount": 9,
    "heroPos": "UTG+1",
    "opponents": [],
    "stackBB": 20,
    "heroBetSize": 2.5,
    "ranges": {
      "22": {
        "Fold": 100
      },
      "33": {
        "Fold": 100
      },
      "44": {
        "ALL-IN": 100
      },
      "55": {
        "ALL-IN": 100
      },
      "66": {
        "ALL-IN": 100
      },
      "77": {
        "ALL-IN": 100
      },
      "88": {
        "ALL-IN": 100
      },
      "99": {
        "ALL-IN": 100
      },
      "AA": {
        "ALL-IN": 100
      },
      "AKs": {
        "ALL-IN": 100
      },
      "AQs": {
        "ALL-IN": 100
      },
      "AJs": {
        "ALL-IN": 100
      },
      "ATs": {
        "ALL-IN": 100
      },
      "A9s": {
        "ALL-IN": 100
      },
      "A8s": {
        "ALL-IN": 100
      },
      "A7s": {
        "ALL-IN": 100
      },
      "A6s": {
        "ALL-IN": 100
      },
      "A5s": {
        "ALL-IN": 100
      },
      "A4s": {
        "ALL-IN": 100
      },
      "A3s": {
        "ALL-IN": 100
      },
      "A2s": {
        "ALL-IN": 100
      },
      "AKo": {
        "ALL-IN": 100
      },
      "KK": {
        "ALL-IN": 100
      },
      "KQs": {
        "ALL-IN": 100
      },
      "KJs": {
        "ALL-IN": 100
      },
      "KTs": {
        "ALL-IN": 100
      },
      "K9s": {
        "ALL-IN": 100
      },
      "K8s": {
        "Fold": 100
      },
      "K7s": {
        "Fold": 100
      },
      "K6s": {
        "Fold": 100
      },
      "Q8s": {
        "Fold": 100
      },
      "QTs": {
        "ALL-IN": 100
      },
      "Q9s": {
        "Fold": 100
      },
      "T9s": {
        "Fold": 100
      },
      "J9s": {
        "Fold": 100
      },
      "JTs": {
        "ALL-IN": 100
      },
      "QJs": {
        "ALL-IN": 100
      },
      "QQ": {
        "ALL-IN": 100
      },
      "TT": {
        "ALL-IN": 100
      },
      "JJ": {
        "ALL-IN": 100
      },
      "T8s": {
        "Fold": 100
      },
      "98s": {
        "Fold": 100
      },
      "87s": {
        "Fold": 100
      },
      "A7o": {
        "Fold": 100
      },
      "A8o": {
        "ALL-IN": 100
      },
      "A9o": {
        "ALL-IN": 100
      },
      "ATo": {
        "ALL-IN": 100
      },
      "AJo": {
        "ALL-IN": 100
      },
      "AQo": {
        "ALL-IN": 100
      },
      "KQo": {
        "ALL-IN": 100
      },
      "KJo": {
        "ALL-IN": 100
      },
      "KTo": {
        "ALL-IN": 100
      },
      "QJo": {
        "Fold": 100
      },
      "K5s": {
        "Fold": 100
      },
      "K4s": {
        "Fold": 100
      },
      "K3s": {
        "Fold": 100
      },
      "K2s": {
        "Fold": 100
      },
      "Q7s": {
        "Fold": 100
      },
      "Q6s": {
        "Fold": 100
      },
      "Q5s": {
        "Fold": 100
      },
      "Q4s": {
        "Fold": 100
      },
      "Q3s": {
        "Fold": 100
      },
      "Q2s": {
        "Fold": 100
      },
      "J8s": {
        "Fold": 100
      },
      "J7s": {
        "Fold": 100
      },
      "J6s": {
        "Fold": 100
      },
      "J5s": {
        "Fold": 100
      },
      "J4s": {
        "Fold": 100
      },
      "J3s": {
        "Fold": 100
      },
      "J2s": {
        "Fold": 100
      },
      "T7s": {
        "Fold": 100
      },
      "T6s": {
        "Fold": 100
      },
      "T5s": {
        "Fold": 100
      },
      "T4s": {
        "Fold": 100
      },
      "T3s": {
        "Fold": 100
      },
      "T2s": {
        "Fold": 100
      },
      "97s": {
        "Fold": 100
      },
      "96s": {
        "Fold": 100
      },
      "95s": {
        "Fold": 100
      },
      "94s": {
        "Fold": 100
      },
      "93s": {
        "Fold": 100
      },
      "92s": {
        "Fold": 100
      },
      "86s": {
        "Fold": 100
      },
      "85s": {
        "Fold": 100
      },
      "84s": {
        "Fold": 100
      },
      "83s": {
        "Fold": 100
      },
      "82s": {
        "Fold": 100
      },
      "72s": {
        "Fold": 100
      },
      "73s": {
        "Fold": 100
      },
      "74s": {
        "Fold": 100
      },
      "75s": {
        "Fold": 100
      },
      "76s": {
        "Fold": 100
      },
      "65s": {
        "Fold": 100
      },
      "64s": {
        "Fold": 100
      },
      "63s": {
        "Fold": 100
      },
      "62s": {
        "Fold": 100
      },
      "54s": {
        "Fold": 100
      },
      "53s": {
        "Fold": 100
      },
      "52s": {
        "Fold": 100
      },
      "43s": {
        "Fold": 100
      },
      "42s": {
        "Fold": 100
      },
      "32s": {
        "Fold": 100
      },
      "QTo": {
        "Fold": 100
      },
      "Q9o": {
        "Fold": 100
      },
      "Q8o": {
        "Fold": 100
      },
      "Q7o": {
        "Fold": 100
      },
      "Q6o": {
        "Fold": 100
      },
      "Q5o": {
        "Fold": 100
      },
      "Q4o": {
        "Fold": 100
      },
      "Q3o": {
        "Fold": 100
      },
      "Q2o": {
        "Fold": 100
      },
      "J2o": {
        "Fold": 100
      },
      "J3o": {
        "Fold": 100
      },
      "J4o": {
        "Fold": 100
      },
      "J5o": {
        "Fold": 100
      },
      "J6o": {
        "Fold": 100
      },
      "J8o": {
        "Fold": 100
      },
      "J9o": {
        "Fold": 100
      },
      "JTo": {
        "Fold": 100
      },
      "T9o": {
        "Fold": 100
      },
      "T8o": {
        "Fold": 100
      },
      "T7o": {
        "Fold": 100
      },
      "T6o": {
        "Fold": 100
      },
      "T5o": {
        "Fold": 100
      },
      "T4o": {
        "Fold": 100
      },
      "T3o": {
        "Fold": 100
      },
      "T2o": {
        "Fold": 100
      },
      "98o": {
        "Fold": 100
      },
      "97o": {
        "Fold": 100
      },
      "96o": {
        "Fold": 100
      },
      "95o": {
        "Fold": 100
      },
      "94o": {
        "Fold": 100
      },
      "93o": {
        "Fold": 100
      },
      "92o": {
        "Fold": 100
      },
      "87o": {
        "Fold": 100
      },
      "86o": {
        "Fold": 100
      },
      "85o": {
        "Fold": 100
      },
      "84o": {
        "Fold": 100
      },
      "83o": {
        "Fold": 100
      },
      "82o": {
        "Fold": 100
      },
      "76o": {
        "Fold": 100
      },
      "75o": {
        "Fold": 100
      },
      "74o": {
        "Fold": 100
      },
      "73o": {
        "Fold": 100
      },
      "72o": {
        "Fold": 100
      },
      "65o": {
        "Fold": 100
      },
      "64o": {
        "Fold": 100
      },
      "63o": {
        "Fold": 100
      },
      "62o": {
        "Fold": 100
      },
      "54o": {
        "Fold": 100
      },
      "53o": {
        "Fold": 100
      },
      "52o": {
        "Fold": 100
      },
      "43o": {
        "Fold": 100
      },
      "42o": {
        "Fold": 100
      },
      "32o": {
        "Fold": 100
      },
      "K9o": {
        "Fold": 100
      },
      "K8o": {
        "Fold": 100
      },
      "K7o": {
        "Fold": 100
      },
      "K6o": {
        "Fold": 100
      },
      "K5o": {
        "Fold": 100
      },
      "K4o": {
        "Fold": 100
      },
      "K3o": {
        "Fold": 100
      },
      "K2o": {
        "Fold": 100
      },
      "A6o": {
        "Fold": 100
      },
      "A5o": {
        "Fold": 100
      },
      "A4o": {
        "Fold": 100
      },
      "A3o": {
        "Fold": 100
      },
      "A2o": {
        "Fold": 100
      },
      "J7o": {
        "Fold": 100
      }
    },
    "customActions": [
      "Fold",
      "ALL-IN"
    ],
    "updatedAt": 1770433744439
  },
  {
    "id": "SC-8M9E7YK-2",
    "name": "OPEN SHOVE - 4bb",
    "description": "",
    "videoLink": "",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "open shove",
    "playerCount": 9,
    "heroPos": "MP",
    "opponents": [],
    "stackBB": 20,
    "heroBetSize": 2.5,
    "ranges": {
      "22": {
        "Fold": 100
      },
      "33": {
        "ALL-IN": 100
      },
      "44": {
        "ALL-IN": 100
      },
      "55": {
        "ALL-IN": 100
      },
      "66": {
        "ALL-IN": 100
      },
      "77": {
        "ALL-IN": 100
      },
      "88": {
        "ALL-IN": 100
      },
      "99": {
        "ALL-IN": 100
      },
      "AA": {
        "ALL-IN": 100
      },
      "AKs": {
        "ALL-IN": 100
      },
      "AQs": {
        "ALL-IN": 100
      },
      "AJs": {
        "ALL-IN": 100
      },
      "ATs": {
        "ALL-IN": 100
      },
      "A9s": {
        "ALL-IN": 100
      },
      "A8s": {
        "ALL-IN": 100
      },
      "A7s": {
        "ALL-IN": 100
      },
      "A6s": {
        "ALL-IN": 100
      },
      "A5s": {
        "ALL-IN": 100
      },
      "A4s": {
        "ALL-IN": 100
      },
      "A3s": {
        "ALL-IN": 100
      },
      "A2s": {
        "ALL-IN": 100
      },
      "AKo": {
        "ALL-IN": 100
      },
      "KK": {
        "ALL-IN": 100
      },
      "KQs": {
        "ALL-IN": 100
      },
      "KJs": {
        "ALL-IN": 100
      },
      "KTs": {
        "ALL-IN": 100
      },
      "K9s": {
        "ALL-IN": 100
      },
      "K8s": {
        "ALL-IN": 100
      },
      "K7s": {
        "Fold": 100
      },
      "K6s": {
        "Fold": 100
      },
      "Q8s": {
        "Fold": 100
      },
      "QTs": {
        "ALL-IN": 100
      },
      "Q9s": {
        "ALL-IN": 100
      },
      "T9s": {
        "Fold": 100
      },
      "J9s": {
        "Fold": 100
      },
      "JTs": {
        "ALL-IN": 100
      },
      "QJs": {
        "ALL-IN": 100
      },
      "QQ": {
        "ALL-IN": 100
      },
      "TT": {
        "ALL-IN": 100
      },
      "JJ": {
        "ALL-IN": 100
      },
      "T8s": {
        "Fold": 100
      },
      "98s": {
        "Fold": 100
      },
      "87s": {
        "Fold": 100
      },
      "A7o": {
        "ALL-IN": 100
      },
      "A8o": {
        "ALL-IN": 100
      },
      "A9o": {
        "ALL-IN": 100
      },
      "ATo": {
        "ALL-IN": 100
      },
      "AJo": {
        "ALL-IN": 100
      },
      "AQo": {
        "ALL-IN": 100
      },
      "KQo": {
        "ALL-IN": 100
      },
      "KJo": {
        "ALL-IN": 100
      },
      "KTo": {
        "ALL-IN": 100
      },
      "QJo": {
        "ALL-IN": 100
      },
      "K5s": {
        "Fold": 100
      },
      "K4s": {
        "Fold": 100
      },
      "K2s": {
        "Fold": 100
      },
      "Q7s": {
        "Fold": 100
      },
      "Q6s": {
        "Fold": 100
      },
      "Q5s": {
        "Fold": 100
      },
      "Q4s": {
        "Fold": 100
      },
      "Q3s": {
        "Fold": 100
      },
      "Q2s": {
        "Fold": 100
      },
      "J8s": {
        "Fold": 100
      },
      "J7s": {
        "Fold": 100
      },
      "J6s": {
        "Fold": 100
      },
      "J5s": {
        "Fold": 100
      },
      "J4s": {
        "Fold": 100
      },
      "J3s": {
        "Fold": 100
      },
      "J2s": {
        "Fold": 100
      },
      "T7s": {
        "Fold": 100
      },
      "T6s": {
        "Fold": 100
      },
      "T5s": {
        "Fold": 100
      },
      "T4s": {
        "Fold": 100
      },
      "T3s": {
        "Fold": 100
      },
      "T2s": {
        "Fold": 100
      },
      "97s": {
        "Fold": 100
      },
      "96s": {
        "Fold": 100
      },
      "95s": {
        "Fold": 100
      },
      "94s": {
        "Fold": 100
      },
      "93s": {
        "Fold": 100
      },
      "92s": {
        "Fold": 100
      },
      "86s": {
        "Fold": 100
      },
      "85s": {
        "Fold": 100
      },
      "84s": {
        "Fold": 100
      },
      "83s": {
        "Fold": 100
      },
      "82s": {
        "Fold": 100
      },
      "72s": {
        "Fold": 100
      },
      "73s": {
        "Fold": 100
      },
      "74s": {
        "Fold": 100
      },
      "75s": {
        "Fold": 100
      },
      "76s": {
        "Fold": 100
      },
      "65s": {
        "Fold": 100
      },
      "64s": {
        "Fold": 100
      },
      "63s": {
        "Fold": 100
      },
      "62s": {
        "Fold": 100
      },
      "54s": {
        "Fold": 100
      },
      "53s": {
        "Fold": 100
      },
      "52s": {
        "Fold": 100
      },
      "43s": {
        "Fold": 100
      },
      "42s": {
        "Fold": 100
      },
      "32s": {
        "Fold": 100
      },
      "Q9o": {
        "Fold": 100
      },
      "Q8o": {
        "Fold": 100
      },
      "Q7o": {
        "Fold": 100
      },
      "Q6o": {
        "Fold": 100
      },
      "Q5o": {
        "Fold": 100
      },
      "Q4o": {
        "Fold": 100
      },
      "Q3o": {
        "Fold": 100
      },
      "Q2o": {
        "Fold": 100
      },
      "J2o": {
        "Fold": 100
      },
      "J3o": {
        "Fold": 100
      },
      "J4o": {
        "Fold": 100
      },
      "J5o": {
        "Fold": 100
      },
      "J6o": {
        "Fold": 100
      },
      "J8o": {
        "Fold": 100
      },
      "J9o": {
        "Fold": 100
      },
      "JTo": {
        "Fold": 100
      },
      "T9o": {
        "Fold": 100
      },
      "T8o": {
        "Fold": 100
      },
      "T7o": {
        "Fold": 100
      },
      "T6o": {
        "Fold": 100
      },
      "T5o": {
        "Fold": 100
      },
      "T4o": {
        "Fold": 100
      },
      "T3o": {
        "Fold": 100
      },
      "T2o": {
        "Fold": 100
      },
      "98o": {
        "Fold": 100
      },
      "97o": {
        "Fold": 100
      },
      "96o": {
        "Fold": 100
      },
      "95o": {
        "Fold": 100
      },
      "94o": {
        "Fold": 100
      },
      "93o": {
        "Fold": 100
      },
      "92o": {
        "Fold": 100
      },
      "87o": {
        "Fold": 100
      },
      "86o": {
        "Fold": 100
      },
      "85o": {
        "Fold": 100
      },
      "84o": {
        "Fold": 100
      },
      "83o": {
        "Fold": 100
      },
      "82o": {
        "Fold": 100
      },
      "76o": {
        "Fold": 100
      },
      "75o": {
        "Fold": 100
      },
      "74o": {
        "Fold": 100
      },
      "73o": {
        "Fold": 100
      },
      "72o": {
        "Fold": 100
      },
      "65o": {
        "Fold": 100
      },
      "64o": {
        "Fold": 100
      },
      "63o": {
        "Fold": 100
      },
      "62o": {
        "Fold": 100
      },
      "54o": {
        "Fold": 100
      },
      "53o": {
        "Fold": 100
      },
      "52o": {
        "Fold": 100
      },
      "43o": {
        "Fold": 100
      },
      "42o": {
        "Fold": 100
      },
      "32o": {
        "Fold": 100
      },
      "K9o": {
        "Fold": 100
      },
      "K8o": {
        "Fold": 100
      },
      "K7o": {
        "Fold": 100
      },
      "K6o": {
        "Fold": 100
      },
      "K5o": {
        "Fold": 100
      },
      "K4o": {
        "Fold": 100
      },
      "K3o": {
        "Fold": 100
      },
      "K2o": {
        "Fold": 100
      },
      "A6o": {
        "Fold": 100
      },
      "A5o": {
        "Fold": 100
      },
      "A4o": {
        "Fold": 100
      },
      "A3o": {
        "Fold": 100
      },
      "A2o": {
        "Fold": 100
      },
      "J7o": {
        "Fold": 100
      },
      "K3s": {
        "Fold": 100
      },
      "QTo": {
        "Fold": 100
      }
    },
    "customActions": [
      "Fold",
      "ALL-IN"
    ],
    "updatedAt": 1770433734563
  },
  {
    "id": "SC-VKKM3UN-3",
    "name": "OPEN SHOVE - 4bb",
    "description": "",
    "videoLink": "",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "open shove",
    "playerCount": 9,
    "heroPos": "LJ",
    "opponents": [],
    "stackBB": 20,
    "heroBetSize": 2.5,
    "ranges": {
      "22": {
        "Fold": 100
      },
      "33": {
        "ALL-IN": 100
      },
      "44": {
        "ALL-IN": 100
      },
      "55": {
        "ALL-IN": 100
      },
      "66": {
        "ALL-IN": 100
      },
      "77": {
        "ALL-IN": 100
      },
      "88": {
        "ALL-IN": 100
      },
      "99": {
        "ALL-IN": 100
      },
      "AA": {
        "ALL-IN": 100
      },
      "AKs": {
        "ALL-IN": 100
      },
      "AQs": {
        "ALL-IN": 100
      },
      "AJs": {
        "ALL-IN": 100
      },
      "ATs": {
        "ALL-IN": 100
      },
      "A9s": {
        "ALL-IN": 100
      },
      "A8s": {
        "ALL-IN": 100
      },
      "A7s": {
        "ALL-IN": 100
      },
      "A6s": {
        "ALL-IN": 100
      },
      "A5s": {
        "ALL-IN": 100
      },
      "A4s": {
        "ALL-IN": 100
      },
      "A3s": {
        "ALL-IN": 100
      },
      "A2s": {
        "ALL-IN": 100
      },
      "AKo": {
        "ALL-IN": 100
      },
      "KK": {
        "ALL-IN": 100
      },
      "KQs": {
        "ALL-IN": 100
      },
      "KJs": {
        "ALL-IN": 100
      },
      "KTs": {
        "ALL-IN": 100
      },
      "K9s": {
        "ALL-IN": 100
      },
      "K8s": {
        "ALL-IN": 100
      },
      "K7s": {
        "ALL-IN": 100
      },
      "K6s": {
        "ALL-IN": 100
      },
      "Q8s": {
        "Fold": 100
      },
      "QTs": {
        "ALL-IN": 100
      },
      "Q9s": {
        "ALL-IN": 100
      },
      "T9s": {
        "ALL-IN": 100
      },
      "J9s": {
        "ALL-IN": 100
      },
      "JTs": {
        "ALL-IN": 100
      },
      "QJs": {
        "ALL-IN": 100
      },
      "QQ": {
        "ALL-IN": 100
      },
      "TT": {
        "ALL-IN": 100
      },
      "JJ": {
        "ALL-IN": 100
      },
      "T8s": {
        "Fold": 100
      },
      "98s": {
        "Fold": 100
      },
      "87s": {
        "Fold": 100
      },
      "A7o": {
        "ALL-IN": 100
      },
      "A8o": {
        "ALL-IN": 100
      },
      "A9o": {
        "ALL-IN": 100
      },
      "ATo": {
        "ALL-IN": 100
      },
      "AJo": {
        "ALL-IN": 100
      },
      "AQo": {
        "ALL-IN": 100
      },
      "KQo": {
        "ALL-IN": 100
      },
      "KJo": {
        "ALL-IN": 100
      },
      "KTo": {
        "ALL-IN": 100
      },
      "QJo": {
        "ALL-IN": 100
      },
      "K5s": {
        "Fold": 100
      },
      "K4s": {
        "Fold": 100
      },
      "K2s": {
        "Fold": 100
      },
      "Q7s": {
        "Fold": 100
      },
      "Q6s": {
        "Fold": 100
      },
      "Q5s": {
        "Fold": 100
      },
      "Q4s": {
        "Fold": 100
      },
      "Q3s": {
        "Fold": 100
      },
      "Q2s": {
        "Fold": 100
      },
      "J8s": {
        "Fold": 100
      },
      "J7s": {
        "Fold": 100
      },
      "J6s": {
        "Fold": 100
      },
      "J5s": {
        "Fold": 100
      },
      "J4s": {
        "Fold": 100
      },
      "J3s": {
        "Fold": 100
      },
      "J2s": {
        "Fold": 100
      },
      "T7s": {
        "Fold": 100
      },
      "T6s": {
        "Fold": 100
      },
      "T5s": {
        "Fold": 100
      },
      "T4s": {
        "Fold": 100
      },
      "T3s": {
        "Fold": 100
      },
      "T2s": {
        "Fold": 100
      },
      "97s": {
        "Fold": 100
      },
      "96s": {
        "Fold": 100
      },
      "95s": {
        "Fold": 100
      },
      "94s": {
        "Fold": 100
      },
      "93s": {
        "Fold": 100
      },
      "92s": {
        "Fold": 100
      },
      "86s": {
        "Fold": 100
      },
      "85s": {
        "Fold": 100
      },
      "84s": {
        "Fold": 100
      },
      "83s": {
        "Fold": 100
      },
      "82s": {
        "Fold": 100
      },
      "72s": {
        "Fold": 100
      },
      "73s": {
        "Fold": 100
      },
      "74s": {
        "Fold": 100
      },
      "75s": {
        "Fold": 100
      },
      "76s": {
        "Fold": 100
      },
      "65s": {
        "Fold": 100
      },
      "64s": {
        "Fold": 100
      },
      "63s": {
        "Fold": 100
      },
      "62s": {
        "Fold": 100
      },
      "54s": {
        "Fold": 100
      },
      "53s": {
        "Fold": 100
      },
      "52s": {
        "Fold": 100
      },
      "43s": {
        "Fold": 100
      },
      "42s": {
        "Fold": 100
      },
      "32s": {
        "Fold": 100
      },
      "Q9o": {
        "Fold": 100
      },
      "Q8o": {
        "Fold": 100
      },
      "Q7o": {
        "Fold": 100
      },
      "Q6o": {
        "Fold": 100
      },
      "Q5o": {
        "Fold": 100
      },
      "Q4o": {
        "Fold": 100
      },
      "Q3o": {
        "Fold": 100
      },
      "Q2o": {
        "Fold": 100
      },
      "J2o": {
        "Fold": 100
      },
      "J3o": {
        "Fold": 100
      },
      "J4o": {
        "Fold": 100
      },
      "J5o": {
        "Fold": 100
      },
      "J6o": {
        "Fold": 100
      },
      "J8o": {
        "Fold": 100
      },
      "J9o": {
        "Fold": 100
      },
      "JTo": {
        "Fold": 100
      },
      "T9o": {
        "Fold": 100
      },
      "T8o": {
        "Fold": 100
      },
      "T7o": {
        "Fold": 100
      },
      "T6o": {
        "Fold": 100
      },
      "T5o": {
        "Fold": 100
      },
      "T4o": {
        "Fold": 100
      },
      "T3o": {
        "Fold": 100
      },
      "T2o": {
        "Fold": 100
      },
      "98o": {
        "Fold": 100
      },
      "97o": {
        "Fold": 100
      },
      "96o": {
        "Fold": 100
      },
      "95o": {
        "Fold": 100
      },
      "94o": {
        "Fold": 100
      },
      "93o": {
        "Fold": 100
      },
      "92o": {
        "Fold": 100
      },
      "87o": {
        "Fold": 100
      },
      "86o": {
        "Fold": 100
      },
      "85o": {
        "Fold": 100
      },
      "84o": {
        "Fold": 100
      },
      "83o": {
        "Fold": 100
      },
      "82o": {
        "Fold": 100
      },
      "76o": {
        "Fold": 100
      },
      "75o": {
        "Fold": 100
      },
      "74o": {
        "Fold": 100
      },
      "73o": {
        "Fold": 100
      },
      "72o": {
        "Fold": 100
      },
      "65o": {
        "Fold": 100
      },
      "64o": {
        "Fold": 100
      },
      "63o": {
        "Fold": 100
      },
      "62o": {
        "Fold": 100
      },
      "54o": {
        "Fold": 100
      },
      "53o": {
        "Fold": 100
      },
      "52o": {
        "Fold": 100
      },
      "43o": {
        "Fold": 100
      },
      "42o": {
        "Fold": 100
      },
      "32o": {
        "Fold": 100
      },
      "K9o": {
        "Fold": 100
      },
      "K8o": {
        "Fold": 100
      },
      "K7o": {
        "Fold": 100
      },
      "K6o": {
        "Fold": 100
      },
      "K5o": {
        "Fold": 100
      },
      "K4o": {
        "Fold": 100
      },
      "K3o": {
        "Fold": 100
      },
      "K2o": {
        "Fold": 100
      },
      "A6o": {
        "ALL-IN": 100
      },
      "A5o": {
        "ALL-IN": 100
      },
      "A4o": {
        "Fold": 100
      },
      "A3o": {
        "Fold": 100
      },
      "A2o": {
        "Fold": 100
      },
      "J7o": {
        "Fold": 100
      },
      "K3s": {
        "Fold": 100
      },
      "QTo": {
        "ALL-IN": 100
      }
    },
    "customActions": [
      "Fold",
      "ALL-IN"
    ],
    "updatedAt": 1770433725082
  },
  {
    "id": "SC-TBS16R8-4",
    "name": "OPEN SHOVE - 4bb",
    "description": "",
    "videoLink": "",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "open shove",
    "playerCount": 9,
    "heroPos": "HJ",
    "opponents": [],
    "stackBB": 20,
    "heroBetSize": 2.5,
    "ranges": {
      "22": {
        "Fold": 100
      },
      "33": {
        "ALL-IN": 100
      },
      "44": {
        "ALL-IN": 100
      },
      "55": {
        "ALL-IN": 100
      },
      "66": {
        "ALL-IN": 100
      },
      "77": {
        "ALL-IN": 100
      },
      "88": {
        "ALL-IN": 100
      },
      "99": {
        "ALL-IN": 100
      },
      "AA": {
        "ALL-IN": 100
      },
      "AKs": {
        "ALL-IN": 100
      },
      "AQs": {
        "ALL-IN": 100
      },
      "AJs": {
        "ALL-IN": 100
      },
      "ATs": {
        "ALL-IN": 100
      },
      "A9s": {
        "ALL-IN": 100
      },
      "A8s": {
        "ALL-IN": 100
      },
      "A7s": {
        "ALL-IN": 100
      },
      "A6s": {
        "ALL-IN": 100
      },
      "A5s": {
        "ALL-IN": 100
      },
      "A4s": {
        "ALL-IN": 100
      },
      "A3s": {
        "ALL-IN": 100
      },
      "A2s": {
        "ALL-IN": 100
      },
      "AKo": {
        "ALL-IN": 100
      },
      "KK": {
        "ALL-IN": 100
      },
      "KQs": {
        "ALL-IN": 100
      },
      "KJs": {
        "ALL-IN": 100
      },
      "KTs": {
        "ALL-IN": 100
      },
      "K9s": {
        "ALL-IN": 100
      },
      "K8s": {
        "ALL-IN": 100
      },
      "K7s": {
        "ALL-IN": 100
      },
      "K6s": {
        "ALL-IN": 100
      },
      "Q8s": {
        "ALL-IN": 100
      },
      "QTs": {
        "ALL-IN": 100
      },
      "Q9s": {
        "ALL-IN": 100
      },
      "T9s": {
        "ALL-IN": 100
      },
      "J9s": {
        "ALL-IN": 100
      },
      "JTs": {
        "ALL-IN": 100
      },
      "QJs": {
        "ALL-IN": 100
      },
      "QQ": {
        "ALL-IN": 100
      },
      "TT": {
        "ALL-IN": 100
      },
      "JJ": {
        "ALL-IN": 100
      },
      "T8s": {
        "Fold": 100
      },
      "98s": {
        "Fold": 100
      },
      "87s": {
        "Fold": 100
      },
      "A7o": {
        "ALL-IN": 100
      },
      "A8o": {
        "ALL-IN": 100
      },
      "A9o": {
        "ALL-IN": 100
      },
      "ATo": {
        "ALL-IN": 100
      },
      "AJo": {
        "ALL-IN": 100
      },
      "AQo": {
        "ALL-IN": 100
      },
      "KQo": {
        "ALL-IN": 100
      },
      "KJo": {
        "ALL-IN": 100
      },
      "KTo": {
        "ALL-IN": 100
      },
      "QJo": {
        "ALL-IN": 100
      },
      "K5s": {
        "ALL-IN": 100
      },
      "K4s": {
        "Fold": 100
      },
      "K2s": {
        "Fold": 100
      },
      "Q7s": {
        "Fold": 100
      },
      "Q6s": {
        "Fold": 100
      },
      "Q4s": {
        "Fold": 100
      },
      "Q3s": {
        "Fold": 100
      },
      "Q2s": {
        "Fold": 100
      },
      "J8s": {
        "Fold": 100
      },
      "J7s": {
        "Fold": 100
      },
      "J6s": {
        "Fold": 100
      },
      "J5s": {
        "Fold": 100
      },
      "J4s": {
        "Fold": 100
      },
      "J3s": {
        "Fold": 100
      },
      "J2s": {
        "Fold": 100
      },
      "T7s": {
        "Fold": 100
      },
      "T6s": {
        "Fold": 100
      },
      "T5s": {
        "Fold": 100
      },
      "T4s": {
        "Fold": 100
      },
      "T3s": {
        "Fold": 100
      },
      "T2s": {
        "Fold": 100
      },
      "97s": {
        "Fold": 100
      },
      "96s": {
        "Fold": 100
      },
      "95s": {
        "Fold": 100
      },
      "94s": {
        "Fold": 100
      },
      "93s": {
        "Fold": 100
      },
      "92s": {
        "Fold": 100
      },
      "86s": {
        "Fold": 100
      },
      "85s": {
        "Fold": 100
      },
      "84s": {
        "Fold": 100
      },
      "83s": {
        "Fold": 100
      },
      "82s": {
        "Fold": 100
      },
      "72s": {
        "Fold": 100
      },
      "73s": {
        "Fold": 100
      },
      "74s": {
        "Fold": 100
      },
      "75s": {
        "Fold": 100
      },
      "76s": {
        "Fold": 100
      },
      "65s": {
        "Fold": 100
      },
      "64s": {
        "Fold": 100
      },
      "63s": {
        "Fold": 100
      },
      "62s": {
        "Fold": 100
      },
      "54s": {
        "Fold": 100
      },
      "53s": {
        "Fold": 100
      },
      "52s": {
        "Fold": 100
      },
      "43s": {
        "Fold": 100
      },
      "42s": {
        "Fold": 100
      },
      "32s": {
        "Fold": 100
      },
      "Q9o": {
        "Fold": 100
      },
      "Q8o": {
        "Fold": 100
      },
      "Q7o": {
        "Fold": 100
      },
      "Q6o": {
        "Fold": 100
      },
      "Q5o": {
        "Fold": 100
      },
      "Q4o": {
        "Fold": 100
      },
      "Q3o": {
        "Fold": 100
      },
      "Q2o": {
        "Fold": 100
      },
      "J2o": {
        "Fold": 100
      },
      "J3o": {
        "Fold": 100
      },
      "J4o": {
        "Fold": 100
      },
      "J5o": {
        "Fold": 100
      },
      "J6o": {
        "Fold": 100
      },
      "J8o": {
        "Fold": 100
      },
      "J9o": {
        "Fold": 100
      },
      "JTo": {
        "ALL-IN": 100
      },
      "T9o": {
        "Fold": 100
      },
      "T8o": {
        "Fold": 100
      },
      "T7o": {
        "Fold": 100
      },
      "T6o": {
        "Fold": 100
      },
      "T5o": {
        "Fold": 100
      },
      "T4o": {
        "Fold": 100
      },
      "T3o": {
        "Fold": 100
      },
      "T2o": {
        "Fold": 100
      },
      "98o": {
        "Fold": 100
      },
      "97o": {
        "Fold": 100
      },
      "96o": {
        "Fold": 100
      },
      "95o": {
        "Fold": 100
      },
      "94o": {
        "Fold": 100
      },
      "93o": {
        "Fold": 100
      },
      "92o": {
        "Fold": 100
      },
      "87o": {
        "Fold": 100
      },
      "86o": {
        "Fold": 100
      },
      "85o": {
        "Fold": 100
      },
      "84o": {
        "Fold": 100
      },
      "83o": {
        "Fold": 100
      },
      "82o": {
        "Fold": 100
      },
      "76o": {
        "Fold": 100
      },
      "75o": {
        "Fold": 100
      },
      "74o": {
        "Fold": 100
      },
      "73o": {
        "Fold": 100
      },
      "72o": {
        "Fold": 100
      },
      "65o": {
        "Fold": 100
      },
      "64o": {
        "Fold": 100
      },
      "63o": {
        "Fold": 100
      },
      "62o": {
        "Fold": 100
      },
      "54o": {
        "Fold": 100
      },
      "53o": {
        "Fold": 100
      },
      "52o": {
        "Fold": 100
      },
      "43o": {
        "Fold": 100
      },
      "42o": {
        "Fold": 100
      },
      "32o": {
        "Fold": 100
      },
      "K9o": {
        "ALL-IN": 100
      },
      "K8o": {
        "Fold": 100
      },
      "K7o": {
        "Fold": 100
      },
      "K6o": {
        "Fold": 100
      },
      "K5o": {
        "Fold": 100
      },
      "K4o": {
        "Fold": 100
      },
      "K3o": {
        "Fold": 100
      },
      "K2o": {
        "Fold": 100
      },
      "A6o": {
        "ALL-IN": 100
      },
      "A5o": {
        "ALL-IN": 100
      },
      "A4o": {
        "ALL-IN": 100
      },
      "A3o": {
        "ALL-IN": 100
      },
      "A2o": {
        "Fold": 100
      },
      "J7o": {
        "Fold": 100
      },
      "K3s": {
        "Fold": 100
      },
      "QTo": {
        "ALL-IN": 100
      },
      "Q5s": {
        "Fold": 100
      }
    },
    "customActions": [
      "Fold",
      "ALL-IN"
    ],
    "updatedAt": 1770433715857
  },
  {
    "id": "SC-TCEK140-5",
    "name": "OPEN SHOVE - 4bb",
    "description": "",
    "videoLink": "",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "open shove",
    "playerCount": 9,
    "heroPos": "CO",
    "opponents": [],
    "stackBB": 20,
    "heroBetSize": 2.5,
    "ranges": {
      "22": {
        "ALL-IN": 100
      },
      "33": {
        "ALL-IN": 100
      },
      "44": {
        "ALL-IN": 100
      },
      "55": {
        "ALL-IN": 100
      },
      "66": {
        "ALL-IN": 100
      },
      "77": {
        "ALL-IN": 100
      },
      "88": {
        "ALL-IN": 100
      },
      "99": {
        "ALL-IN": 100
      },
      "AA": {
        "ALL-IN": 100
      },
      "AKs": {
        "ALL-IN": 100
      },
      "AQs": {
        "ALL-IN": 100
      },
      "AJs": {
        "ALL-IN": 100
      },
      "ATs": {
        "ALL-IN": 100
      },
      "A9s": {
        "ALL-IN": 100
      },
      "A8s": {
        "ALL-IN": 100
      },
      "A7s": {
        "ALL-IN": 100
      },
      "A6s": {
        "ALL-IN": 100
      },
      "A5s": {
        "ALL-IN": 100
      },
      "A4s": {
        "ALL-IN": 100
      },
      "A3s": {
        "ALL-IN": 100
      },
      "A2s": {
        "ALL-IN": 100
      },
      "AKo": {
        "ALL-IN": 100
      },
      "KK": {
        "ALL-IN": 100
      },
      "KQs": {
        "ALL-IN": 100
      },
      "KJs": {
        "ALL-IN": 100
      },
      "KTs": {
        "ALL-IN": 100
      },
      "K9s": {
        "ALL-IN": 100
      },
      "K8s": {
        "ALL-IN": 100
      },
      "K7s": {
        "ALL-IN": 100
      },
      "K6s": {
        "ALL-IN": 100
      },
      "Q8s": {
        "ALL-IN": 100
      },
      "QTs": {
        "ALL-IN": 100
      },
      "Q9s": {
        "ALL-IN": 100
      },
      "T9s": {
        "ALL-IN": 100
      },
      "J9s": {
        "ALL-IN": 100
      },
      "JTs": {
        "ALL-IN": 100
      },
      "QJs": {
        "ALL-IN": 100
      },
      "QQ": {
        "ALL-IN": 100
      },
      "TT": {
        "ALL-IN": 100
      },
      "JJ": {
        "ALL-IN": 100
      },
      "T8s": {
        "ALL-IN": 100
      },
      "98s": {
        "ALL-IN": 100
      },
      "87s": {
        "Fold": 100
      },
      "A7o": {
        "ALL-IN": 100
      },
      "A8o": {
        "ALL-IN": 100
      },
      "A9o": {
        "ALL-IN": 100
      },
      "ATo": {
        "ALL-IN": 100
      },
      "AJo": {
        "ALL-IN": 100
      },
      "AQo": {
        "ALL-IN": 100
      },
      "KQo": {
        "ALL-IN": 100
      },
      "KJo": {
        "ALL-IN": 100
      },
      "KTo": {
        "ALL-IN": 100
      },
      "QJo": {
        "ALL-IN": 100
      },
      "K5s": {
        "ALL-IN": 100
      },
      "K4s": {
        "ALL-IN": 100
      },
      "K2s": {
        "Fold": 100
      },
      "Q7s": {
        "ALL-IN": 100
      },
      "Q6s": {
        "ALL-IN": 100
      },
      "Q5s": {
        "Fold": 100
      },
      "Q4s": {
        "Fold": 100
      },
      "Q3s": {
        "Fold": 100
      },
      "Q2s": {
        "Fold": 100
      },
      "J8s": {
        "ALL-IN": 100
      },
      "J7s": {
        "Fold": 100
      },
      "J6s": {
        "Fold": 100
      },
      "J5s": {
        "Fold": 100
      },
      "J4s": {
        "Fold": 100
      },
      "J3s": {
        "Fold": 100
      },
      "J2s": {
        "Fold": 100
      },
      "T7s": {
        "Fold": 100
      },
      "T6s": {
        "Fold": 100
      },
      "T5s": {
        "Fold": 100
      },
      "T4s": {
        "Fold": 100
      },
      "T3s": {
        "Fold": 100
      },
      "T2s": {
        "Fold": 100
      },
      "97s": {
        "Fold": 100
      },
      "96s": {
        "Fold": 100
      },
      "95s": {
        "Fold": 100
      },
      "94s": {
        "Fold": 100
      },
      "93s": {
        "Fold": 100
      },
      "92s": {
        "Fold": 100
      },
      "86s": {
        "Fold": 100
      },
      "85s": {
        "Fold": 100
      },
      "84s": {
        "Fold": 100
      },
      "83s": {
        "Fold": 100
      },
      "82s": {
        "Fold": 100
      },
      "72s": {
        "Fold": 100
      },
      "73s": {
        "Fold": 100
      },
      "74s": {
        "Fold": 100
      },
      "75s": {
        "Fold": 100
      },
      "76s": {
        "Fold": 100
      },
      "65s": {
        "Fold": 100
      },
      "64s": {
        "Fold": 100
      },
      "63s": {
        "Fold": 100
      },
      "62s": {
        "Fold": 100
      },
      "54s": {
        "Fold": 100
      },
      "53s": {
        "Fold": 100
      },
      "52s": {
        "Fold": 100
      },
      "43s": {
        "Fold": 100
      },
      "42s": {
        "Fold": 100
      },
      "32s": {
        "Fold": 100
      },
      "Q9o": {
        "ALL-IN": 100
      },
      "Q8o": {
        "Fold": 100
      },
      "Q7o": {
        "Fold": 100
      },
      "Q6o": {
        "Fold": 100
      },
      "Q5o": {
        "Fold": 100
      },
      "Q4o": {
        "Fold": 100
      },
      "Q3o": {
        "Fold": 100
      },
      "Q2o": {
        "Fold": 100
      },
      "J2o": {
        "Fold": 100
      },
      "J3o": {
        "Fold": 100
      },
      "J4o": {
        "Fold": 100
      },
      "J5o": {
        "Fold": 100
      },
      "J6o": {
        "Fold": 100
      },
      "J8o": {
        "Fold": 100
      },
      "J9o": {
        "Fold": 100
      },
      "JTo": {
        "ALL-IN": 100
      },
      "T9o": {
        "Fold": 100
      },
      "T8o": {
        "Fold": 100
      },
      "T7o": {
        "Fold": 100
      },
      "T6o": {
        "Fold": 100
      },
      "T5o": {
        "Fold": 100
      },
      "T4o": {
        "Fold": 100
      },
      "T3o": {
        "Fold": 100
      },
      "T2o": {
        "Fold": 100
      },
      "98o": {
        "Fold": 100
      },
      "97o": {
        "Fold": 100
      },
      "96o": {
        "Fold": 100
      },
      "95o": {
        "Fold": 100
      },
      "94o": {
        "Fold": 100
      },
      "93o": {
        "Fold": 100
      },
      "92o": {
        "Fold": 100
      },
      "87o": {
        "Fold": 100
      },
      "86o": {
        "Fold": 100
      },
      "85o": {
        "Fold": 100
      },
      "84o": {
        "Fold": 100
      },
      "83o": {
        "Fold": 100
      },
      "82o": {
        "Fold": 100
      },
      "76o": {
        "Fold": 100
      },
      "75o": {
        "Fold": 100
      },
      "74o": {
        "Fold": 100
      },
      "73o": {
        "Fold": 100
      },
      "72o": {
        "Fold": 100
      },
      "65o": {
        "Fold": 100
      },
      "64o": {
        "Fold": 100
      },
      "63o": {
        "Fold": 100
      },
      "62o": {
        "Fold": 100
      },
      "54o": {
        "Fold": 100
      },
      "53o": {
        "Fold": 100
      },
      "52o": {
        "Fold": 100
      },
      "43o": {
        "Fold": 100
      },
      "42o": {
        "Fold": 100
      },
      "32o": {
        "Fold": 100
      },
      "K9o": {
        "ALL-IN": 100
      },
      "K8o": {
        "ALL-IN": 100
      },
      "K7o": {
        "ALL-IN": 100
      },
      "K6o": {
        "Fold": 100
      },
      "K5o": {
        "Fold": 100
      },
      "K4o": {
        "Fold": 100
      },
      "K3o": {
        "Fold": 100
      },
      "K2o": {
        "Fold": 100
      },
      "A6o": {
        "ALL-IN": 100
      },
      "A5o": {
        "ALL-IN": 100
      },
      "A4o": {
        "ALL-IN": 100
      },
      "A3o": {
        "ALL-IN": 100
      },
      "A2o": {
        "ALL-IN": 100
      },
      "J7o": {
        "Fold": 100
      },
      "K3s": {
        "ALL-IN": 100
      },
      "QTo": {
        "ALL-IN": 100
      }
    },
    "customActions": [
      "Fold",
      "ALL-IN"
    ],
    "updatedAt": 1770433706577
  },
  {
    "id": "SC-CPZRN55-6",
    "name": "OPEN SHOVE - 4bb",
    "description": "",
    "videoLink": "",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "open shove",
    "playerCount": 9,
    "heroPos": "BTN",
    "opponents": [],
    "stackBB": 20,
    "heroBetSize": 2.5,
    "ranges": {
      "22": {
        "ALL-IN": 100
      },
      "33": {
        "ALL-IN": 100
      },
      "44": {
        "ALL-IN": 100
      },
      "55": {
        "ALL-IN": 100
      },
      "66": {
        "ALL-IN": 100
      },
      "77": {
        "ALL-IN": 100
      },
      "88": {
        "ALL-IN": 100
      },
      "99": {
        "ALL-IN": 100
      },
      "AA": {
        "ALL-IN": 100
      },
      "AKs": {
        "ALL-IN": 100
      },
      "AQs": {
        "ALL-IN": 100
      },
      "AJs": {
        "ALL-IN": 100
      },
      "ATs": {
        "ALL-IN": 100
      },
      "A9s": {
        "ALL-IN": 100
      },
      "A8s": {
        "ALL-IN": 100
      },
      "A7s": {
        "ALL-IN": 100
      },
      "A6s": {
        "ALL-IN": 100
      },
      "A5s": {
        "ALL-IN": 100
      },
      "A4s": {
        "ALL-IN": 100
      },
      "A3s": {
        "ALL-IN": 100
      },
      "A2s": {
        "ALL-IN": 100
      },
      "AKo": {
        "ALL-IN": 100
      },
      "KK": {
        "ALL-IN": 100
      },
      "KQs": {
        "ALL-IN": 100
      },
      "KJs": {
        "ALL-IN": 100
      },
      "KTs": {
        "ALL-IN": 100
      },
      "K9s": {
        "ALL-IN": 100
      },
      "K8s": {
        "ALL-IN": 100
      },
      "K7s": {
        "ALL-IN": 100
      },
      "K6s": {
        "ALL-IN": 100
      },
      "Q8s": {
        "ALL-IN": 100
      },
      "QTs": {
        "ALL-IN": 100
      },
      "Q9s": {
        "ALL-IN": 100
      },
      "T9s": {
        "ALL-IN": 100
      },
      "J9s": {
        "ALL-IN": 100
      },
      "JTs": {
        "ALL-IN": 100
      },
      "QJs": {
        "ALL-IN": 100
      },
      "QQ": {
        "ALL-IN": 100
      },
      "TT": {
        "ALL-IN": 100
      },
      "JJ": {
        "ALL-IN": 100
      },
      "T8s": {
        "ALL-IN": 100
      },
      "98s": {
        "ALL-IN": 100
      },
      "87s": {
        "Fold": 100
      },
      "A7o": {
        "ALL-IN": 100
      },
      "A8o": {
        "ALL-IN": 100
      },
      "A9o": {
        "ALL-IN": 100
      },
      "ATo": {
        "ALL-IN": 100
      },
      "AJo": {
        "ALL-IN": 100
      },
      "AQo": {
        "ALL-IN": 100
      },
      "KQo": {
        "ALL-IN": 100
      },
      "KJo": {
        "ALL-IN": 100
      },
      "KTo": {
        "ALL-IN": 100
      },
      "QJo": {
        "ALL-IN": 100
      },
      "K5s": {
        "ALL-IN": 100
      },
      "K4s": {
        "ALL-IN": 100
      },
      "K2s": {
        "ALL-IN": 100
      },
      "Q7s": {
        "ALL-IN": 100
      },
      "Q6s": {
        "ALL-IN": 100
      },
      "Q5s": {
        "ALL-IN": 100
      },
      "Q4s": {
        "ALL-IN": 100
      },
      "Q3s": {
        "Fold": 100
      },
      "Q2s": {
        "Fold": 100
      },
      "J8s": {
        "ALL-IN": 100
      },
      "J7s": {
        "ALL-IN": 100
      },
      "J6s": {
        "Fold": 100
      },
      "J5s": {
        "Fold": 100
      },
      "J4s": {
        "Fold": 100
      },
      "J3s": {
        "Fold": 100
      },
      "J2s": {
        "Fold": 100
      },
      "T7s": {
        "ALL-IN": 100
      },
      "T6s": {
        "Fold": 100
      },
      "T5s": {
        "Fold": 100
      },
      "T4s": {
        "Fold": 100
      },
      "T3s": {
        "Fold": 100
      },
      "T2s": {
        "Fold": 100
      },
      "97s": {
        "Fold": 100
      },
      "96s": {
        "Fold": 100
      },
      "95s": {
        "Fold": 100
      },
      "94s": {
        "Fold": 100
      },
      "93s": {
        "Fold": 100
      },
      "92s": {
        "Fold": 100
      },
      "86s": {
        "Fold": 100
      },
      "85s": {
        "Fold": 100
      },
      "84s": {
        "Fold": 100
      },
      "83s": {
        "Fold": 100
      },
      "82s": {
        "Fold": 100
      },
      "72s": {
        "Fold": 100
      },
      "73s": {
        "Fold": 100
      },
      "74s": {
        "Fold": 100
      },
      "75s": {
        "Fold": 100
      },
      "76s": {
        "Fold": 100
      },
      "65s": {
        "Fold": 100
      },
      "64s": {
        "Fold": 100
      },
      "63s": {
        "Fold": 100
      },
      "62s": {
        "Fold": 100
      },
      "54s": {
        "Fold": 100
      },
      "53s": {
        "Fold": 100
      },
      "52s": {
        "Fold": 100
      },
      "43s": {
        "Fold": 100
      },
      "42s": {
        "Fold": 100
      },
      "32s": {
        "Fold": 100
      },
      "Q9o": {
        "ALL-IN": 100
      },
      "Q8o": {
        "ALL-IN": 100
      },
      "Q7o": {
        "Fold": 100
      },
      "Q6o": {
        "Fold": 100
      },
      "Q5o": {
        "Fold": 100
      },
      "Q4o": {
        "Fold": 100
      },
      "Q3o": {
        "Fold": 100
      },
      "Q2o": {
        "Fold": 100
      },
      "J2o": {
        "Fold": 100
      },
      "J3o": {
        "Fold": 100
      },
      "J4o": {
        "Fold": 100
      },
      "J5o": {
        "Fold": 100
      },
      "J6o": {
        "Fold": 100
      },
      "J8o": {
        "Fold": 100
      },
      "J9o": {
        "ALL-IN": 100
      },
      "JTo": {
        "ALL-IN": 100
      },
      "T9o": {
        "ALL-IN": 100
      },
      "T8o": {
        "Fold": 100
      },
      "T7o": {
        "Fold": 100
      },
      "T6o": {
        "Fold": 100
      },
      "T5o": {
        "Fold": 100
      },
      "T4o": {
        "Fold": 100
      },
      "T3o": {
        "Fold": 100
      },
      "T2o": {
        "Fold": 100
      },
      "98o": {
        "Fold": 100
      },
      "97o": {
        "Fold": 100
      },
      "96o": {
        "Fold": 100
      },
      "95o": {
        "Fold": 100
      },
      "94o": {
        "Fold": 100
      },
      "93o": {
        "Fold": 100
      },
      "92o": {
        "Fold": 100
      },
      "87o": {
        "Fold": 100
      },
      "86o": {
        "Fold": 100
      },
      "85o": {
        "Fold": 100
      },
      "84o": {
        "Fold": 100
      },
      "83o": {
        "Fold": 100
      },
      "82o": {
        "Fold": 100
      },
      "76o": {
        "Fold": 100
      },
      "75o": {
        "Fold": 100
      },
      "74o": {
        "Fold": 100
      },
      "73o": {
        "Fold": 100
      },
      "72o": {
        "Fold": 100
      },
      "65o": {
        "Fold": 100
      },
      "64o": {
        "Fold": 100
      },
      "63o": {
        "Fold": 100
      },
      "62o": {
        "Fold": 100
      },
      "54o": {
        "Fold": 100
      },
      "53o": {
        "Fold": 100
      },
      "52o": {
        "Fold": 100
      },
      "43o": {
        "Fold": 100
      },
      "42o": {
        "Fold": 100
      },
      "32o": {
        "Fold": 100
      },
      "K9o": {
        "ALL-IN": 100
      },
      "K8o": {
        "ALL-IN": 100
      },
      "K7o": {
        "ALL-IN": 100
      },
      "K6o": {
        "ALL-IN": 100
      },
      "K5o": {
        "ALL-IN": 100
      },
      "K4o": {
        "ALL-IN": 100
      },
      "K3o": {
        "Fold": 100
      },
      "K2o": {
        "Fold": 100
      },
      "A6o": {
        "ALL-IN": 100
      },
      "A5o": {
        "ALL-IN": 100
      },
      "A4o": {
        "ALL-IN": 100
      },
      "A3o": {
        "ALL-IN": 100
      },
      "A2o": {
        "ALL-IN": 100
      },
      "J7o": {
        "Fold": 100
      },
      "K3s": {
        "ALL-IN": 100
      },
      "QTo": {
        "ALL-IN": 100
      }
    },
    "customActions": [
      "Fold",
      "ALL-IN"
    ],
    "updatedAt": 1770433697148
  },
  {
    "id": "SC-F9Q95WW-7",
    "name": "OPEN SHOVE - 4bb",
    "description": "",
    "videoLink": "",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "open shove",
    "playerCount": 9,
    "heroPos": "SB",
    "opponents": [],
    "stackBB": 20,
    "heroBetSize": 2.5,
    "ranges": {
      "22": {
        "ALL-IN": 100
      },
      "33": {
        "ALL-IN": 100
      },
      "44": {
        "ALL-IN": 100
      },
      "55": {
        "ALL-IN": 100
      },
      "66": {
        "ALL-IN": 100
      },
      "77": {
        "ALL-IN": 100
      },
      "88": {
        "ALL-IN": 100
      },
      "99": {
        "ALL-IN": 100
      },
      "AA": {
        "ALL-IN": 100
      },
      "AKs": {
        "ALL-IN": 100
      },
      "AQs": {
        "ALL-IN": 100
      },
      "AJs": {
        "ALL-IN": 100
      },
      "ATs": {
        "ALL-IN": 100
      },
      "A9s": {
        "ALL-IN": 100
      },
      "A8s": {
        "ALL-IN": 100
      },
      "A7s": {
        "ALL-IN": 100
      },
      "A6s": {
        "ALL-IN": 100
      },
      "A5s": {
        "ALL-IN": 100
      },
      "A4s": {
        "ALL-IN": 100
      },
      "A3s": {
        "ALL-IN": 100
      },
      "A2s": {
        "ALL-IN": 100
      },
      "AKo": {
        "ALL-IN": 100
      },
      "KK": {
        "ALL-IN": 100
      },
      "KQs": {
        "ALL-IN": 100
      },
      "KJs": {
        "ALL-IN": 100
      },
      "KTs": {
        "ALL-IN": 100
      },
      "K9s": {
        "ALL-IN": 100
      },
      "K8s": {
        "ALL-IN": 100
      },
      "K7s": {
        "ALL-IN": 100
      },
      "K6s": {
        "ALL-IN": 100
      },
      "Q8s": {
        "ALL-IN": 100
      },
      "QTs": {
        "ALL-IN": 100
      },
      "Q9s": {
        "ALL-IN": 100
      },
      "T9s": {
        "ALL-IN": 100
      },
      "J9s": {
        "ALL-IN": 100
      },
      "JTs": {
        "ALL-IN": 100
      },
      "QJs": {
        "ALL-IN": 100
      },
      "QQ": {
        "ALL-IN": 100
      },
      "TT": {
        "ALL-IN": 100
      },
      "JJ": {
        "ALL-IN": 100
      },
      "T8s": {
        "ALL-IN": 100
      },
      "98s": {
        "ALL-IN": 100
      },
      "87s": {
        "ALL-IN": 100
      },
      "A7o": {
        "ALL-IN": 100
      },
      "A8o": {
        "ALL-IN": 100
      },
      "A9o": {
        "ALL-IN": 100
      },
      "ATo": {
        "ALL-IN": 100
      },
      "AJo": {
        "ALL-IN": 100
      },
      "AQo": {
        "ALL-IN": 100
      },
      "KQo": {
        "ALL-IN": 100
      },
      "KJo": {
        "ALL-IN": 100
      },
      "KTo": {
        "ALL-IN": 100
      },
      "QJo": {
        "ALL-IN": 100
      },
      "K5s": {
        "ALL-IN": 100
      },
      "K4s": {
        "ALL-IN": 100
      },
      "K2s": {
        "ALL-IN": 100
      },
      "Q7s": {
        "ALL-IN": 100
      },
      "Q6s": {
        "ALL-IN": 100
      },
      "Q5s": {
        "ALL-IN": 100
      },
      "Q4s": {
        "ALL-IN": 100
      },
      "Q3s": {
        "ALL-IN": 100
      },
      "Q2s": {
        "ALL-IN": 100
      },
      "J8s": {
        "ALL-IN": 100
      },
      "J7s": {
        "ALL-IN": 100
      },
      "J6s": {
        "ALL-IN": 100
      },
      "J5s": {
        "ALL-IN": 100
      },
      "J4s": {
        "ALL-IN": 100
      },
      "J3s": {
        "ALL-IN": 100
      },
      "J2s": {
        "ALL-IN": 100
      },
      "T7s": {
        "ALL-IN": 100
      },
      "T6s": {
        "ALL-IN": 100
      },
      "T5s": {
        "ALL-IN": 100
      },
      "T4s": {
        "ALL-IN": 100
      },
      "T3s": {
        "ALL-IN": 100
      },
      "T2s": {
        "ALL-IN": 100
      },
      "97s": {
        "ALL-IN": 100
      },
      "96s": {
        "ALL-IN": 100
      },
      "95s": {
        "ALL-IN": 100
      },
      "94s": {
        "ALL-IN": 100
      },
      "93s": {
        "ALL-IN": 100
      },
      "92s": {
        "Fold": 100
      },
      "86s": {
        "ALL-IN": 100
      },
      "85s": {
        "ALL-IN": 100
      },
      "83s": {
        "Fold": 100
      },
      "82s": {
        "Fold": 100
      },
      "75s": {
        "ALL-IN": 100
      },
      "76s": {
        "ALL-IN": 100
      },
      "65s": {
        "ALL-IN": 100
      },
      "63s": {
        "Fold": 100
      },
      "62s": {
        "Fold": 100
      },
      "54s": {
        "ALL-IN": 100
      },
      "53s": {
        "Fold": 100
      },
      "52s": {
        "Fold": 100
      },
      "43s": {
        "Fold": 100
      },
      "42s": {
        "Fold": 100
      },
      "32s": {
        "Fold": 100
      },
      "Q9o": {
        "ALL-IN": 100
      },
      "Q8o": {
        "ALL-IN": 100
      },
      "Q7o": {
        "ALL-IN": 100
      },
      "Q6o": {
        "ALL-IN": 100
      },
      "Q5o": {
        "ALL-IN": 100
      },
      "Q4o": {
        "ALL-IN": 100
      },
      "Q3o": {
        "ALL-IN": 100
      },
      "Q2o": {
        "ALL-IN": 100
      },
      "J2o": {
        "ALL-IN": 100
      },
      "J3o": {
        "ALL-IN": 100
      },
      "J4o": {
        "ALL-IN": 100
      },
      "J5o": {
        "ALL-IN": 100
      },
      "J6o": {
        "ALL-IN": 100
      },
      "J8o": {
        "ALL-IN": 100
      },
      "J9o": {
        "ALL-IN": 100
      },
      "JTo": {
        "ALL-IN": 100
      },
      "T9o": {
        "ALL-IN": 100
      },
      "T8o": {
        "ALL-IN": 100
      },
      "T7o": {
        "ALL-IN": 100
      },
      "T6o": {
        "ALL-IN": 100
      },
      "T5o": {
        "ALL-IN": 100
      },
      "T4o": {
        "ALL-IN": 100
      },
      "T3o": {
        "Fold": 100
      },
      "T2o": {
        "Fold": 100
      },
      "98o": {
        "ALL-IN": 100
      },
      "97o": {
        "ALL-IN": 100
      },
      "96o": {
        "ALL-IN": 100
      },
      "95o": {
        "Fold": 100
      },
      "94o": {
        "Fold": 100
      },
      "93o": {
        "Fold": 100
      },
      "92o": {
        "Fold": 100
      },
      "87o": {
        "ALL-IN": 100
      },
      "86o": {
        "ALL-IN": 100
      },
      "85o": {
        "Fold": 100
      },
      "84o": {
        "Fold": 100
      },
      "83o": {
        "Fold": 100
      },
      "82o": {
        "Fold": 100
      },
      "76o": {
        "ALL-IN": 100
      },
      "75o": {
        "Fold": 100
      },
      "74o": {
        "Fold": 100
      },
      "73o": {
        "Fold": 100
      },
      "72o": {
        "Fold": 100
      },
      "65o": {
        "Fold": 100
      },
      "64o": {
        "Fold": 100
      },
      "63o": {
        "Fold": 100
      },
      "62o": {
        "Fold": 100
      },
      "54o": {
        "Fold": 100
      },
      "53o": {
        "Fold": 100
      },
      "52o": {
        "Fold": 100
      },
      "43o": {
        "Fold": 100
      },
      "42o": {
        "Fold": 100
      },
      "32o": {
        "Fold": 100
      },
      "K9o": {
        "ALL-IN": 100
      },
      "K8o": {
        "ALL-IN": 100
      },
      "K7o": {
        "ALL-IN": 100
      },
      "K6o": {
        "ALL-IN": 100
      },
      "K5o": {
        "ALL-IN": 100
      },
      "K4o": {
        "ALL-IN": 100
      },
      "K3o": {
        "ALL-IN": 100
      },
      "K2o": {
        "ALL-IN": 100
      },
      "A6o": {
        "ALL-IN": 100
      },
      "A5o": {
        "ALL-IN": 100
      },
      "A4o": {
        "ALL-IN": 100
      },
      "A3o": {
        "ALL-IN": 100
      },
      "A2o": {
        "ALL-IN": 100
      },
      "J7o": {
        "ALL-IN": 100
      },
      "K3s": {
        "ALL-IN": 100
      },
      "QTo": {
        "ALL-IN": 100
      },
      "84s": {
        "Fold": 100
      },
      "74s": {
        "Fold": 100
      },
      "64s": {
        "Fold": 100
      },
      "73s": {
        "Fold": 100
      },
      "72s": {
        "Fold": 100
      }
    },
    "customActions": [
      "Fold",
      "ALL-IN"
    ],
    "updatedAt": 1770433688664
  }
];

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem(CURRENT_USER_KEY));
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [currentUser, setCurrentUser] = useState<string | null>(() => localStorage.getItem(CURRENT_USER_KEY));
  const [currentView, setCurrentView] = useState<'selection' | 'setup' | 'trainer'>('selection');
  
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
  const [creatorDefaultStep, setCreatorDefaultStep] = useState<number | 'manage'>(1);
  const [showAdminMemberModal, setShowAdminMemberModal] = useState(false);
  const [timeBankSetting, setTimeBankSetting] = useState<TimeBankOption>('OFF');
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const timerRef = useRef<number | null>(null);
  const sessionTimerRef = useRef<number | null>(null);
  const recentHandKeysRef = useRef<string[]>([]);
  const lastActionTypeRef = useRef<string | null>(null);

  const isAdmin = currentUser === 'gabrielfpoker@gmail.com';

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(CURRENT_USER_KEY, currentUser);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentView === 'trainer' && !showReportModal && !showStopModal) {
      sessionTimerRef.current = window.setInterval(() => setSessionElapsedSeconds(prev => prev + 1), 1000);
    } else {
      if (sessionTimerRef.current) { clearInterval(sessionTimerRef.current); sessionTimerRef.current = null; }
    }
    return () => { if (sessionTimerRef.current) clearInterval(sessionTimerRef.current); };
  }, [currentView, showReportModal, showStopModal]);

  useEffect(() => {
    if (activeScenario) {
      recentHandKeysRef.current = [];
      lastActionTypeRef.current = null;
    }
  }, [activeScenario]);

  const resetToNewHand = useCallback(() => {
    if (!activeScenario) return;
    const activeHands = getActiveHandsFromRange(activeScenario.ranges);
    if (activeHands.length === 0) return;

    // Inteligência para evitar repetição
    let availableHands = activeHands.filter(h => !recentHandKeysRef.current.includes(h));
    
    // Se esgotar as mãos não repetidas, limpa o histórico parcial (mantém os últimos 2 para evitar repetição imediata)
    if (availableHands.length === 0) {
      recentHandKeysRef.current = recentHandKeysRef.current.slice(-2);
      availableHands = activeHands.filter(h => !recentHandKeysRef.current.includes(h));
    }
    
    // Se ainda assim não tiver mãos (ex: range muito pequeno), usa todas
    if (availableHands.length === 0) availableHands = activeHands;

    // Inteligência para variar as ações
    const handsByAction: { [action: string]: string[] } = {};
    availableHands.forEach(h => {
      const frequencies = activeScenario.ranges[h];
      let bestAction = 'Fold';
      let maxFreq = -1;
      Object.entries(frequencies).forEach(([action, freq]) => {
        if ((freq as number) > maxFreq) {
          maxFreq = freq as number;
          bestAction = action;
        }
      });
      if (!handsByAction[bestAction]) handsByAction[bestAction] = [];
      handsByAction[bestAction].push(h);
    });

    const availableActions = Object.keys(handsByAction);
    let chosenAction = availableActions[Math.floor(Math.random() * availableActions.length)];

    // Tenta escolher uma ação diferente da anterior se houver mais de uma disponível
    if (availableActions.length > 1 && chosenAction === lastActionTypeRef.current) {
      const otherActions = availableActions.filter(a => a !== lastActionTypeRef.current);
      chosenAction = otherActions[Math.floor(Math.random() * otherActions.length)];
    }

    const actionHands = handsByAction[chosenAction];
    const randomHandKey = actionHands[Math.floor(Math.random() * actionHands.length)];
    
    // Atualiza histórico
    recentHandKeysRef.current.push(randomHandKey);
    if (recentHandKeysRef.current.length > 15) recentHandKeysRef.current.shift();
    lastActionTypeRef.current = chosenAction;

    const heroCards = generateCardsFromKey(randomHandKey);
    const count = activeScenario.playerCount;
    const tablePositions = getTablePositions(count);
    const preflopOrder = getPreflopOrder(count);
    setBoard(activeScenario.street !== 'PREFLOP' ? ['Ah', 'Kh', 'Qh'] : []);
    let totalPot = 0;
    const heroOrderIndex = preflopOrder.indexOf(activeScenario.heroPos);
    const scenarioPlayers: Player[] = tablePositions.map((posName, i) => {
      const isHero = posName === activeScenario.heroPos;
      const isOpponent = activeScenario.opponents.includes(posName);
      const orderIndex = preflopOrder.indexOf(posName);
      let status = PlayerStatus.IDLE;
      let betAmount = 0;
      let hasCards = false;
      if (isOpponent) { betAmount = BIG_BLIND_VALUE * (activeScenario.opponentBetSize || 1); hasCards = true; }
      if (orderIndex < heroOrderIndex && orderIndex !== -1 && !isOpponent) status = PlayerStatus.FOLDED;
      else if (isHero) { status = PlayerStatus.ACTING; hasCards = true; }
      else if (orderIndex > heroOrderIndex) hasCards = true;
      if (posName === 'SB') betAmount = Math.max(betAmount, BIG_BLIND_VALUE / 2);
      else if (posName === 'BB') betAmount = Math.max(betAmount, BIG_BLIND_VALUE);
      totalPot += betAmount;
      return { id: i + 1, name: `P${i + 1}`, chips: (activeScenario.stackBB * BIG_BLIND_VALUE) - betAmount, positionName: posName, status, betAmount, cards: isHero ? heroCards : (hasCards ? ['BACK', 'BACK'] : undefined), isDealer: count === 2 ? posName === 'SB' : posName === 'BTN' };
    });
    setPlayers(scenarioPlayers);
    setCurrentPot(totalPot);
    setFeedback('idle');
    if (timeBankSetting !== 'OFF') setTimeRemaining(timeBankSetting as number);
  }, [timeBankSetting, activeScenario]);

  const handleActionClick = useCallback((label: string, isTimeout: boolean = false) => {
    if (feedback !== 'idle' && !isTimeout) return;
    const hero = players.find(p => p.positionName === activeScenario?.heroPos);
    if (!hero || !activeScenario) return;

    let addedBet = 0;
    const labelLower = label.toLowerCase();
    
    if (labelLower.includes('all-in') || labelLower.includes('shove')) {
      addedBet = hero.chips;
    } else if (labelLower.includes('call') || labelLower.includes('pagar')) {
      const maxBetOnTable = Math.max(...players.map(p => p.betAmount || 0));
      addedBet = Math.max(0, maxBetOnTable - (hero.betAmount || 0));
    } else if (!labelLower.includes('fold')) {
      const match = label.match(/[\d.]+/);
      if (match) {
        const targetBet = parseFloat(match[0]) * BIG_BLIND_VALUE;
        addedBet = Math.max(0, targetBet - (hero.betAmount || 0));
      }
    }

    const finalAddedBet = Math.min(addedBet, hero.chips);

    setPlayers(prev => prev.map(p => {
      if (p.positionName === activeScenario?.heroPos) {
        return {
          ...p,
          chips: p.chips - finalAddedBet,
          betAmount: (p.betAmount || 0) + finalAddedBet,
          status: labelLower.includes('fold') ? PlayerStatus.FOLDED : p.status
        };
      }
      return p;
    }));

    if (finalAddedBet > 0) {
      setCurrentPot(prev => prev + finalAddedBet);
    }

    const [c1, c2] = hero.cards!;
    const rank1Idx = RANKS.indexOf(c1[0]); const rank2Idx = RANKS.indexOf(c2[0]);
    let handKey = rank1Idx === rank2Idx ? c1[0] + c2[0] : (rank1Idx > rank2Idx ? c1[0] + c2[0] + (c1[1] === c2[1] ? 's' : 'o') : c2[0] + c1[0] + (c1[1] === c2[1] ? 's' : 'o'));
    const actionMap = activeScenario.ranges[handKey];
    let isCorrect = actionMap ? (actionMap[label] || 0) > 0 : label.toLowerCase().includes('fold');

    setFeedback(isTimeout ? 'timeout' : (isCorrect ? 'correct' : 'incorrect'));
    
    const newRecord: HandRecord = { 
      id: Date.now(), 
      cards: hero.cards?.join(' ') || '??', 
      action: isTimeout ? 'TEMPO' : label, 
      correctAction: actionMap ? Object.keys(actionMap)[0] : 'Fold', 
      status: isCorrect ? 'correct' : 'incorrect', 
      timestamp: new Date().toLocaleTimeString(), 
      isTimeout 
    };

    setHandHistory(prev => {
      const newHistory = [...prev, newRecord];
      
      // Verifica se atingiu a meta de mãos
      const isGoalReached = trainingGoal?.type === 'hands' && newHistory.length >= trainingGoal.value;
      
      setTimeout(() => {
        if (isGoalReached) {
          setShowReportModal(true);
          setCurrentView('selection');
        } else {
          resetToNewHand();
        }
      }, 1500);

      return newHistory;
    });
  }, [players, feedback, activeScenario, trainingGoal, resetToNewHand]);

  // Monitoramento da meta de tempo
  useEffect(() => {
    if (currentView === 'trainer' && trainingGoal?.type === 'time' && !showReportModal) {
      const goalSeconds = trainingGoal.value * 60;
      if (sessionElapsedSeconds >= goalSeconds) {
        setShowReportModal(true);
        setCurrentView('selection');
      }
    }
  }, [sessionElapsedSeconds, trainingGoal, currentView, showReportModal]);

  // FIX: Lógica de contagem regressiva do Time Bank
  useEffect(() => {
    if (currentView === 'trainer' && timeBankSetting !== 'OFF' && feedback === 'idle') {
      timerRef.current = window.setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 0.1) {
            if (timerRef.current) clearInterval(timerRef.current);
            handleActionClick('Fold', true);
            return 0;
          }
          return prev - 0.1;
        });
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentView, timeBankSetting, feedback, handleActionClick]);

  useEffect(() => {
    if (isAuthenticated && currentView === 'trainer' && activeScenario) resetToNewHand();
  }, [isAuthenticated, currentView, activeScenario, resetToNewHand]);

  const handleLogin = (email: string) => { setCurrentUser(email); setIsAuthenticated(true); };
  const handleLogout = () => { setIsAuthenticated(false); setCurrentUser(null); localStorage.removeItem(CURRENT_USER_KEY); setCurrentView('selection'); };

  return (
    <div className={`w-full h-screen bg-[#050505] flex overflow-hidden relative ${!isAuthenticated ? 'flex-col' : ''}`}>
      <MobileWarningOverlay />
      {!isAuthenticated ? (
        authView === 'login' ? <LoginScreen onLogin={handleLogin} onGoToRegister={() => setAuthView('register')} /> : <RegisterScreen onRegister={handleLogin} onGoToLogin={() => setAuthView('login')} />
      ) : (
        <>
          {currentView === 'selection' ? (
            <SelectionScreen scenarios={scenarios} onSelect={(s) => { setActiveScenario(s); setCurrentView('setup'); }} onCreateNew={() => setShowScenarioCreatorModal(true)} onEditScenarios={() => { setCreatorDefaultStep('manage'); setShowScenarioCreatorModal(true); }} onShowAdmin={() => setShowAdminMemberModal(true)} onLogout={handleLogout} isAdmin={isAdmin} />
          ) : currentView === 'setup' && activeScenario ? (
            <TrainingSetupScreen scenarioName={activeScenario.name} onStart={(goal) => { 
              setHandHistory([]);
              setSessionElapsedSeconds(0);
              setTrainingGoal(goal); 
              setCurrentView('trainer'); 
            }} onBack={() => setCurrentView('selection')} />
          ) : (
            <>
              <Sidebar 
                isOpen={sidebarOpen} 
                isPinned={sidebarPinned} 
                onToggle={() => setSidebarOpen(!sidebarOpen)} 
                onTogglePin={() => setSidebarPinned(!sidebarPinned)} 
                onToggleFocusMode={() => setIsFocusMode(true)} 
                onStopTreino={() => setShowStopModal(true)} 
                onRestartTreino={() => setShowRestartModal(true)} 
                onShowSpotInfo={() => setShowSpotInfoModal(true)} 
                onShowConfig={() => setShowConfigModal(true)} 
                history={handHistory} 
                ranges={activeScenario?.ranges} 
                customActions={activeScenario?.customActions} 
                sessionElapsedSeconds={sessionElapsedSeconds} 
                currentUser={currentUser} 
                trainingGoal={trainingGoal}
              />
              <div className={`flex-1 flex flex-col items-center transition-all duration-300 ${sidebarOpen ? 'ml-80' : 'ml-0'}`}>
                <div className="flex-1 w-full relative flex items-center justify-center pt-16 pb-8 px-8 overflow-hidden">
                  <div className="relative w-full max-w-[820px] aspect-[16/10] flex items-center justify-center select-none">
                    <div className="absolute inset-16 border-[12px] border-[#1a1a1a] rounded-[150px] shadow-[0_40px_100px_-20px_rgba(0,0,0,1)] bg-[#080808] overflow-hidden">
                      <div className="absolute inset-2 bg-[radial-gradient(ellipse_at_center,_#064e3b_0%,_#022c22_70%,_#000000_100%)] rounded-[130px] flex flex-col items-center justify-center gap-6">
                        <div className="bg-black/90 px-6 py-2 rounded-full border border-emerald-500/30 flex items-center gap-2 shadow-2xl backdrop-blur-md">
                          <span className="text-emerald-500 font-black text-[10px] tracking-widest uppercase">POT</span>
                          <span className="text-white font-mono font-black text-lg">{(currentPot / BIG_BLIND_VALUE).toFixed(1)} BB</span>
                        </div>
                        {board.length > 0 && (
                          <div className="flex gap-2">
                            {board.map((card, i) => (
                              <div key={i} className="w-12 h-18 bg-white rounded-lg shadow-2xl flex flex-col items-center justify-center border border-gray-300">
                                <span className={`text-xl font-black ${card[1] === 'h' || card[1] === 'd' ? 'text-red-600' : 'text-gray-900'}`}>{card[0]}</span>
                                <span className={`text-2xl ${card[1] === 'h' || card[1] === 'd' ? 'text-red-600' : 'text-gray-900'}`}>{card[1]}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="absolute inset-0 w-full h-full pointer-events-none">
                      {players.map((player, index) => {
                        const pLayout = (TABLE_LAYOUTS[activeScenario?.playerCount as keyof typeof TABLE_LAYOUTS] || TABLE_LAYOUTS[9])[index];
                        return (
                          <div key={player.id} style={{ top: `${pLayout.y}%`, left: `${pLayout.x}%`, transform: 'translate(-50%, -50%)' }} className="absolute pointer-events-auto">
                            <PlayerSeat player={player} isMain={player.positionName === activeScenario?.heroPos} bigBlindValue={BIG_BLIND_VALUE} className={pLayout.pos} timeRemaining={player.positionName === activeScenario?.heroPos ? timeRemaining : 0} maxTime={timeBankSetting !== 'OFF' ? Number(timeBankSetting) : 0} totalPlayers={activeScenario?.playerCount} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="w-full flex flex-col items-center justify-center px-4 pb-12 z-[100] min-h-[140px]">
                  {feedback !== 'idle' ? (
                    <div className={`py-4 px-10 rounded-2xl border font-black uppercase text-xs tracking-widest animate-in zoom-in ${feedback === 'correct' ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' : 'bg-red-600/20 border-red-500 text-red-400'}`}>
                      {feedback === 'correct' ? 'Decisão Correta' : feedback === 'timeout' ? 'Tempo Esgotado' : 'Decisão Errada'}
                    </div>
                  ) : (
                    <div className="flex gap-2 w-full max-w-[420px] px-2 items-center justify-center flex-wrap">
                      {(activeScenario?.customActions || ['Fold', 'Raise']).map((label, idx) => (
                        <button key={idx} onClick={() => handleActionClick(label)} style={{ backgroundColor: getActionColor(label, idx) }} className="flex-1 min-w-[100px] h-12 rounded-xl border border-white/20 text-[11px] font-black uppercase tracking-wider text-white shadow-2xl hover:brightness-110 active:scale-95 transition-all">
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
          <StopTrainingModal isOpen={showStopModal} onClose={() => setShowStopModal(false)} onConfirm={() => { setCurrentView('selection'); setShowStopModal(false); setShowReportModal(true); }} />
          <SessionReportModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} onNewTraining={() => { setCurrentView('selection'); setShowReportModal(false); }} history={handHistory} scenarioName={activeScenario?.name || ""} />
          <RestartConfirmationModal isOpen={showRestartModal} onClose={() => setShowRestartModal(false)} onConfirm={() => { setHandHistory([]); setShowRestartModal(false); resetToNewHand(); }} />
          <ConfigModal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} timeBank={timeBankSetting} setTimeBank={setTimeBankSetting} />
          <AdminMemberModal isOpen={showAdminMemberModal} onClose={() => setShowAdminMemberModal(false)} />
          <ScenarioCreatorModal isOpen={showScenarioCreatorModal} scenarios={scenarios} onClose={() => setShowScenarioCreatorModal(false)} onSave={(s) => setScenarios(prev => [...prev, s])} defaultStep={creatorDefaultStep} />
        </>
      )}
    </div>
  );
};

export default App;
