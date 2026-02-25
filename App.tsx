
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

import { SYSTEM_DEFAULT_SCENARIOS } from './scenarios.ts';

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
