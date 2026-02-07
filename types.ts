
export enum PlayerStatus {
  IDLE = 'IDLE',
  ACTING = 'ACTING',
  FOLDED = 'FOLDED',
  POST_SB = 'POST_SB',
  POST_BB = 'POST_BB'
}

export interface Player {
  id: number;
  name: string;
  chips: number;
  positionName: string;
  status?: PlayerStatus;
  cards?: string[];
  betAmount?: number;
  isDealer?: boolean;
}

export type ActionType = 'Fold' | 'Call' | 'Raise' | 'All-In';

export type TimeBankOption = 'OFF' | 7 | 15 | 25;

export interface HandRecord {
  id: number;
  cards: string;
  action: string;
  correctAction: string;
  status: 'correct' | 'incorrect';
  timestamp: string;
  isTimeout?: boolean;
}

export interface ActionFrequency {
  [action: string]: number;
}

export interface RangeData {
  [handOrCombo: string]: ActionFrequency;
}

export interface Scenario {
  id: string;
  name: string;
  modality: string;
  street: string;
  preflopAction: string;
  playerCount: number;
  heroPos: string;
  opponents: string[];
  stackBB: number;
  individualStacks?: { [position: string]: number };
  heroBetSize: number; 
  opponentBetSize?: number; 
  ranges: RangeData;
  customActions?: string[]; 
  description?: string;
  videoLink?: string;
  updatedAt?: number; // Timestamp da última alteração
}

export interface User {
  email: string;
  name: string;
  password?: string;
  mustChangePassword?: boolean;
  isAdmin?: boolean;
  hasMultiLoginAttempt?: boolean;
  whatsapp?: string;
}

export type TrainingGoalType = 'hands' | 'time' | 'free';

export interface TrainingGoal {
  type: TrainingGoalType;
  value: number; 
}
