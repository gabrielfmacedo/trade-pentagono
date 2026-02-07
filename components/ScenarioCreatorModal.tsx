
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { RangeData, Scenario, ActionFrequency } from '../types.ts';

interface ScenarioCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (s: Scenario) => void;
  onDelete?: (id: string) => void;
  scenarios?: Scenario[];
}

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const SUITS = ['h', 'd', 's', 'c'];
const SCENARIO_DRAFT_KEY = 'lab11_scenario_draft';

const CUSTOM_PALETTE = [
  '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1', '#14b8a6',
];

const getActionColor = (label: string, index: number): string => {
  const l = label.toLowerCase();
  if (l.includes('fold')) return '#334155';
  if (l.includes('call') || l.includes('pagar') || l === 'limp') return '#0ea5e9';
  if (l.includes('raise') || l === 'rfi' || l.includes('3-bet') || l.includes('4-bet') || l.includes('aumentar') || l.includes('iso')) return '#10b981';
  if (l.includes('all-in') || l.includes('shove')) return '#ef4444';
  return CUSTOM_PALETTE[index % CUSTOM_PALETTE.length];
};

const EMPTY_CELL_BG = '#0f172a'; 

const ScenarioCreatorModal: React.FC<ScenarioCreatorModalProps> = ({ isOpen, onClose, onSave, onDelete, scenarios = [] }) => {
  const [step, setStep] = useState<number | 'manage'>(1);
  const [isDragging, setIsDragging] = useState(false);
  
  const [currentId, setCurrentId] = useState<string>(`sc-${Date.now()}`);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [modality, setModality] = useState('MTT');
  const [street, setStreet] = useState('PREFLOP');
  const [action, setAction] = useState('RFI');
  const [playerCount, setPlayerCount] = useState(9);
  const [heroPos, setHeroPos] = useState('BTN');
  const [opponents, setOpponents] = useState<string[]>([]);
  const [stackBB, setStackBB] = useState(100);
  
  // New State for Individual Stacks
  const [stackMode, setStackMode] = useState<'equal' | 'different'>('equal');
  const [individualStacks, setIndividualStacks] = useState<{ [pos: string]: number }>({});

  const [heroBetSize, setHeroBetSize] = useState(2.5);
  const [opponentBetSize, setOpponentBetSize] = useState(2.2);
  const [customActions, setCustomActions] = useState<string[]>([]);
  const [newActionInput, setNewActionInput] = useState('');

  const [rangeData, setRangeData] = useState<RangeData>({});
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [selectedFrequency, setSelectedFrequency] = useState(100);
  const [isEraserMode, setIsEraserMode] = useState(false);
  const [lastAutosave, setLastAutosave] = useState<Date | null>(null);
  
  const [rangeText, setRangeText] = useState('');
  const [suitRangeText, setSuitRangeText] = useState('');
  const [gtoWizardText, setGtoWizardText] = useState('');

  // Autosave timer effect
  useEffect(() => {
    if (!isOpen || step === 'manage') return;

    const interval = setInterval(() => {
      const draft = {
        currentId, name, description, videoLink, modality, street, action,
        playerCount, heroPos, opponents, stackBB, stackMode, individualStacks, 
        heroBetSize, opponentBetSize, customActions, rangeData, step
      };
      localStorage.setItem(SCENARIO_DRAFT_KEY, JSON.stringify(draft));
      setLastAutosave(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, [isOpen, step, currentId, name, description, videoLink, modality, street, action, playerCount, heroPos, opponents, stackBB, stackMode, individualStacks, heroBetSize, opponentBetSize, customActions, rangeData]);

  useEffect(() => {
    if (isOpen && !name) {
      const savedDraft = localStorage.getItem(SCENARIO_DRAFT_KEY);
      if (savedDraft) {
        if (window.confirm('Um rascunho de cenário anterior foi encontrado. Deseja recuperá-lo?')) {
          try {
            const d = JSON.parse(savedDraft);
            setCurrentId(d.currentId); setName(d.name); setDescription(d.description);
            setVideoLink(d.videoLink); setModality(d.modality); setStreet(d.street);
            setAction(d.action); setPlayerCount(d.playerCount); setHeroPos(d.heroPos);
            setOpponents(d.opponents || []); setStackBB(d.stackBB); 
            setStackMode(d.stackMode || 'equal'); setIndividualStacks(d.individualStacks || {});
            setHeroBetSize(d.heroBetSize || 2.5); setOpponentBetSize(d.opponentBetSize || 2.2);
            setCustomActions(d.customActions || []); setRangeData(d.rangeData || {});
            setStep(d.step || 1);
          } catch (e) { console.error('Falha ao restaurar rascunho', e); }
        } else {
          localStorage.removeItem(SCENARIO_DRAFT_KEY);
        }
      }
    }
  }, [isOpen]);

  const availablePositions = useMemo(() => {
    if (playerCount === 2) return ['BTN', 'SB'];
    if (playerCount <= 4) return ['CO', 'BTN', 'SB', 'BB'];
    if (playerCount <= 6) return ['LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
    return ['UTG', 'UTG+1', 'MP', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  }, [playerCount]);

  useEffect(() => {
    if (!availablePositions.includes(heroPos)) {
      setHeroPos(availablePositions[0] || 'BTN');
    }
    setOpponents(prev => prev.filter(pos => availablePositions.includes(pos)));
    
    // Cleanup individual stacks for positions that no longer exist
    setIndividualStacks(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(pos => {
        if (!availablePositions.includes(pos)) delete next[pos];
      });
      return next;
    });
  }, [playerCount, availablePositions, heroPos]);

  useEffect(() => {
    if (customActions.length === 0) {
      if (street === 'PREFLOP') {
        if (action === 'RFI') setCustomActions(['Fold', 'Raise']);
        else if (action === 'open shove') setCustomActions(['Fold', 'All-In']);
        else if (action === 'limp') setCustomActions(['Fold', 'Limp']);
        else if (action === 'iso') setCustomActions(['Fold', 'Limp', 'Raise']);
        else setCustomActions(['Fold', 'Call', 'Raise']);
      } else {
        setCustomActions(['Fold', 'Call', 'Raise']);
      }
    }
  }, [action, street, customActions]);

  const isReRaiseAction = useMemo(() => {
    const a = action.toLowerCase();
    return a.includes('3-bet') || a.includes('4-bet') || a.includes('squeeze') || a.includes('iso');
  }, [action]);

  const loadScenarioToEdit = (s: Scenario) => {
    setCurrentId(s.id);
    setName(s.name);
    setDescription(s.description || '');
    setVideoLink(s.videoLink || '');
    setModality(s.modality);
    setStreet(s.street);
    setAction(s.preflopAction);
    setPlayerCount(s.playerCount);
    setHeroPos(s.heroPos);
    setOpponents(s.opponents || []);
    setStackBB(s.stackBB);
    setStackMode(s.individualStacks ? 'different' : 'equal');
    setIndividualStacks(s.individualStacks || {});
    setHeroBetSize(s.heroBetSize || 2.5);
    setOpponentBetSize(s.opponentBetSize || 2.2);
    setRangeData(s.ranges || {});
    setCustomActions(s.customActions || []);
    setStep(1);
  };

  const duplicateScenario = (s: Scenario) => {
    const newId = `sc-${Date.now()}`;
    const newName = `${s.name} (Cópia)`;
    setCurrentId(newId);
    setName(newName);
    setDescription(s.description || '');
    setVideoLink(s.videoLink || '');
    setModality(s.modality);
    setStreet(s.street);
    setAction(s.preflopAction);
    setPlayerCount(s.playerCount);
    setHeroPos(s.heroPos);
    setOpponents(s.opponents || []);
    setStackBB(s.stackBB);
    setStackMode(s.individualStacks ? 'different' : 'equal');
    setIndividualStacks(JSON.parse(JSON.stringify(s.individualStacks || {})));
    setHeroBetSize(s.heroBetSize || 2.5);
    setOpponentBetSize(s.opponentBetSize || 2.2);
    setRangeData(JSON.parse(JSON.stringify(s.ranges || {})));
    setCustomActions([...(s.customActions || [])]);
    setStep(1);
  };

  const toggleOpponent = useCallback((pos: string) => {
    setOpponents(prev => prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]);
  }, []);

  const handleIndividualStackChange = (pos: string, val: string) => {
    const num = parseFloat(val) || 0;
    setIndividualStacks(prev => ({ ...prev, [pos]: num }));
  };

  const availableRangeActions = useMemo(() => {
    if (customActions.length > 0) return customActions;
    return ['Fold', 'Call', 'Raise'].filter(a => a !== '');
  }, [customActions]);

  const updateHandAction = (draft: RangeData, hand: string, actionName: string, freq: number) => {
    if (freq === 100) { draft[hand] = { [actionName]: 100 }; } 
    else { const current = draft[hand] || {}; draft[hand] = { ...current, [actionName]: freq }; }
  };

  const clearHand = useCallback((handKey: string) => {
    setRangeData(prev => { 
        const next = { ...prev }; 
        delete next[handKey];
        Object.keys(next).forEach(k => {
           if (k.length === 4) {
              const r1 = k[0]; const s1 = k[1]; const r2 = k[2]; const s2 = k[3];
              let genericKey = r1 === r2 ? r1 + r1 : (RANKS.indexOf(r1) < RANKS.indexOf(r2) ? r1 + r2 : r2 + r1) + (s1 === s2 ? 's' : 'o');
              if (genericKey === handKey) delete next[k];
           }
        });
        return next; 
    });
  }, []);

  const applyActionToHand = useCallback((handKey: string) => {
    if (isEraserMode) { clearHand(handKey); return; }
    if (!selectedAction) return;
    setRangeData(prev => {
      const next = { ...prev };
      updateHandAction(next, handKey, selectedAction, selectedFrequency);
      return next;
    });
  }, [selectedAction, selectedFrequency, isEraserMode, clearHand]);

  const handleMouseDown = (hand: string, e: React.MouseEvent) => {
    if (e.button === 2) { clearHand(hand); return; }
    setIsDragging(true); applyActionToHand(hand);
  };

  const handleMouseEnter = (hand: string) => { if (isDragging) applyActionToHand(hand); };
  const handleMouseUp = () => setIsDragging(false);
  useEffect(() => { window.addEventListener('mouseup', handleMouseUp); return () => window.removeEventListener('mouseup', handleMouseUp); }, []);

  const getCellStyles = (handKey: string) => {
    const r1 = handKey[0]; const r2 = handKey[1];
    const isSuited = handKey.endsWith('s'); const isPair = handKey.length === 2;
    const totalCombosCount = isPair ? 6 : (isSuited ? 4 : 12);
    const handData = rangeData[handKey];
    const comboEntries = Object.entries(rangeData).filter(([k]) => {
      if (k.length !== 4) return false;
      const cr1 = k[0]; const cs1 = k[1]; const cr2 = k[2]; const cs2 = k[3];
      const ranksMatch = (cr1 === r1 && cr2 === r2) || (cr1 === r2 && cr2 === r1);
      if (!ranksMatch) return false;
      return isPair ? cr1 === cr2 : isSuited ? cs1 === cs2 : cs1 !== cs2;
    });
    const aggregated: ActionFrequency = {};
    if (handData) { Object.entries(handData).forEach(([act, freq]) => aggregated[act] = (aggregated[act] || 0) + (freq as number)); } 
    else if (comboEntries.length > 0) { comboEntries.forEach(([_, data]) => Object.entries(data).forEach(([act, freq]) => aggregated[act] = (aggregated[act] || 0) + ((freq as number) / totalCombosCount))); }
    if (Object.keys(aggregated).length === 0) return { backgroundColor: EMPTY_CELL_BG, color: '#475569' };
    let cumulative = 0;
    const gradientParts = Object.entries(aggregated).sort((a, b) => a[0] === 'Fold' ? 1 : b[0] === 'Fold' ? -1 : 0).map(([act, freq]) => {
      const start = cumulative; cumulative += (freq as number);
      return `${getActionColor(act, availableRangeActions.indexOf(act))} ${start}% ${cumulative}%`;
    });
    if (cumulative < 99.9) gradientParts.push(`${EMPTY_CELL_BG} ${cumulative}% 100%`);
    return { background: `linear-gradient(to right, ${gradientParts.join(', ')})`, color: (cumulative > 50 && (aggregated['Fold'] || 0) < 50) ? 'white' : '#94a3b8' };
  };

  const parseRangeText = () => {
    if (!rangeText.trim()) return;
    if (!selectedAction) {
      alert("Por favor, selecione uma ação para pintar o range primeiro.");
      return;
    }
    const parts = rangeText.split(',').map(p => p.trim());
    const newRangeData = { ...rangeData };

    parts.forEach(part => {
      // Pairs like AA-TT or 55+
      if (/^[2-9TJQK A]{2}(\+|-|$)/.test(part)) {
        if (part.includes('-')) {
          const [top, bottom] = part.split('-').map(p => p[0]);
          const topIdx = RANKS.indexOf(top);
          const bottomIdx = RANKS.indexOf(bottom);
          for (let i = topIdx; i <= bottomIdx; i++) {
            updateHandAction(newRangeData, RANKS[i] + RANKS[i], selectedAction, selectedFrequency);
          }
        } else if (part.endsWith('+')) {
          const rank = part[0];
          const idx = RANKS.indexOf(rank);
          for (let i = 0; i <= idx; i++) {
            updateHandAction(newRangeData, RANKS[i] + RANKS[i], selectedAction, selectedFrequency);
          }
        } else {
          updateHandAction(newRangeData, part.substring(0, 2), selectedAction, selectedFrequency);
        }
      } 
      // Suited/Offsuit like AKs-AQs, T9s+, AKo
      else if (/^[2-9TJQK A]{2}[so](\+|-|$)/.test(part)) {
        const r1 = part[0]; const r2 = part[1]; const type = part[2];
        if (part.includes('-')) {
           const bottomPart = part.split('-')[1];
           const bottomR2 = bottomPart[1];
           const startIdx = RANKS.indexOf(r2);
           const endIdx = RANKS.indexOf(bottomR2);
           for (let i = startIdx; i <= endIdx; i++) {
             updateHandAction(newRangeData, r1 + RANKS[i] + type, selectedAction, selectedFrequency);
           }
        } else if (part.endsWith('+')) {
           const idx = RANKS.indexOf(r2);
           const stopIdx = RANKS.indexOf(r1) + 1;
           for (let i = stopIdx; i <= idx; i++) {
             updateHandAction(newRangeData, r1 + RANKS[i] + type, selectedAction, selectedFrequency);
           }
        } else {
           updateHandAction(newRangeData, r1 + r2 + type, selectedAction, selectedFrequency);
        }
      }
    });
    setRangeData(newRangeData);
    setRangeText('');
  };

  const parseSuitRangeText = () => {
    if (!suitRangeText.trim()) return;
    if (!selectedAction) {
      alert("Por favor, selecione uma ação para pintar o range primeiro.");
      return;
    }
    const parts = suitRangeText.split(',').map(p => p.trim());
    const newRangeData = { ...rangeData };
    parts.forEach(p => {
      if (p.length === 4) {
        updateHandAction(newRangeData, p, selectedAction, selectedFrequency);
      }
    });
    setRangeData(newRangeData);
    setSuitRangeText('');
  };

  const parseGtoWizardRange = () => {
    if (!gtoWizardText.trim()) return;
    if (!selectedAction) {
      alert("Por favor, selecione uma ação antes de importar do GTO Wizard.");
      return;
    }
    
    // Formato: 5d5c: 1, 5h5c: 1, Tc9c: 0.8353...
    const pairs = gtoWizardText.split(',').map(p => p.trim());
    const newRangeData = { ...rangeData };
    let addedCount = 0;

    pairs.forEach(pair => {
      const [combo, freqStr] = pair.split(':').map(s => s.trim());
      if (combo && combo.length === 4 && freqStr) {
        const freq = parseFloat(freqStr) * 100;
        if (!isNaN(freq)) {
          updateHandAction(newRangeData, combo, selectedAction, freq);
          addedCount++;
        }
      }
    });

    if (addedCount > 0) {
      setRangeData(newRangeData);
      setGtoWizardText('');
      alert(`${addedCount} combos importados com sucesso para a ação: ${selectedAction}`);
    } else {
      alert("Nenhum combo válido encontrado. Verifique o formato do texto.");
    }
  };

  const onClearMatrixClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Deseja limpar toda a matriz estratégica? Todas as mãos pintadas serão removidas.')) {
      setRangeData(() => ({}));
      setRangeText('');
      setSuitRangeText('');
      setGtoWizardText('');
      localStorage.removeItem(SCENARIO_DRAFT_KEY);
    }
  }, []);

  const handleFinish = () => {
    const newScenario: Scenario = {
      id: currentId, name: name || 'Novo Cenário', description, videoLink, modality, street, preflopAction: action,
      playerCount, heroPos, opponents, stackBB, 
      individualStacks: stackMode === 'different' ? individualStacks : undefined,
      heroBetSize, opponentBetSize: isReRaiseAction ? opponentBetSize : undefined,
      ranges: rangeData, customActions
    };
    if (onSave) onSave(newScenario);
    localStorage.removeItem(SCENARIO_DRAFT_KEY);
    onClose(); setStep(1); setRangeData({}); setCurrentId(`sc-${Date.now()}`);
    setName(''); setDescription(''); setVideoLink('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/98 backdrop-blur-2xl animate-in fade-in duration-300">
      <div className={`bg-[#080808] w-full ${step === 2 ? 'max-w-[1250px]' : 'max-w-4xl'} border border-white/10 rounded-[40px] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden transition-all duration-500`}>
        
        <div className={`px-10 py-8 border-b border-white/5 flex justify-between items-center ${step === 2 ? 'bg-sky-500/5' : 'bg-emerald-500/5'}`}>
          <div className="flex items-center gap-6">
            <div className={`w-14 h-14 ${step === 'manage' ? 'bg-gray-700' : step === 1 ? 'bg-emerald-600' : 'bg-sky-600'} rounded-2xl flex items-center justify-center shadow-2xl`}>
               {step === 1 ? <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M12 4v16m8-8H4" /></svg> : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M9 17l-5-5 5-5m11 5H4" /></svg>}
            </div>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none mb-1">{step === 'manage' ? 'GERENCIAR' : step === 1 ? 'CRIADOR' : 'MATRIZ GTO'}</h2>
              <div className="flex items-center gap-3">
                <p className={`text-[11px] font-black tracking-[0.3em] uppercase ${step === 1 ? 'text-emerald-500' : 'text-sky-500'}`}>{step === 1 ? 'Etapa 1: Mesa e Spot' : 'Etapa 2: Range Estratégico'}</p>
                {lastAutosave && <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest italic animate-pulse">Autosave: {lastAutosave.toLocaleTimeString()}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {step === 1 && <button onClick={() => setStep('manage')} className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase text-gray-400 tracking-widest hover:bg-white/10 hover:text-white transition-all">Editar Cenários</button>}
            <button onClick={() => { onClose(); setStep(1); }} className="p-3 text-gray-500 hover:text-white transition-all bg-white/5 rounded-full"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg></button>
          </div>
        </div>

        {step === 'manage' && (
          <div className="flex-1 overflow-y-auto p-12 custom-scrollbar animate-in fade-in duration-500">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {scenarios.map(s => (
                  <div key={s.id} className="group bg-white/5 border border-white/5 p-6 rounded-[32px] flex items-center justify-between hover:bg-white/10 hover:border-sky-500/30 transition-all">
                     <div className="flex-1 min-w-0 pr-4">
                        <div className="text-sky-500 text-[9px] font-black uppercase tracking-widest mb-1">{s.modality} • {s.street}</div>
                        <h4 className="text-white font-black text-lg uppercase truncate">{s.name}</h4>
                     </div>
                     <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => { if(window.confirm('Excluir este cenário permanentemente?')) onDelete?.(s.id); }} className="p-3 bg-red-500/10 rounded-xl text-red-500 hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100" title="Excluir Cenário">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                        <button onClick={() => duplicateScenario(s)} className="p-3 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100" title="Duplicar Cenário">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 7v-2a2 2 0 012-2h9a2 2 0 012 2v9a2 2 0 01-2 2h-2M5 11h9a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9a2 2 0 012-2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                        <button onClick={() => loadScenarioToEdit(s)} className="px-5 py-3 bg-sky-600 rounded-xl text-white font-black text-[10px] uppercase tracking-widest hover:bg-sky-500 transition-all opacity-0 group-hover:opacity-100 shadow-xl">Editar Tudo</button>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex-1 overflow-y-auto p-12 custom-scrollbar space-y-10 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-3">
                <label className="text-[11px] text-gray-500 font-black uppercase tracking-widest px-1">Identificação do Spot</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: CO Open vs BTN 3-Bet" className="w-full bg-white/5 border border-white/10 rounded-[20px] py-5 px-8 text-white text-lg font-bold outline-none focus:border-emerald-500/50" />
              </div>
              <div className="space-y-3">
                <label className="text-[11px] text-gray-500 font-black uppercase tracking-widest px-1">Street</label>
                <div className="grid grid-cols-2 gap-3">
                  {['PREFLOP', 'FLOP'].map(s => (<button key={s} onClick={() => setStreet(s)} className={`py-5 rounded-[20px] border text-xs font-black transition-all uppercase ${s === street ? 'bg-emerald-600 border-emerald-400' : 'bg-white/5 border-white/5 text-gray-500'}`}>{s}</button>))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-4">
                <label className="text-[11px] text-gray-500 font-black uppercase tracking-widest px-1">Ação Principal</label>
                <div className="flex flex-wrap gap-2">
                  {(street === 'PREFLOP' ? ['RFI', '3-bet', '4-bet', '5-bet', 'squeeze', 'limp', 'iso', 'open shove'] : ['C-bet Flop', 'vs C-bet']).map(a => (<button key={a} onClick={() => setAction(a)} className={`px-6 py-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${a === action ? 'bg-emerald-600 border-emerald-400 text-white shadow-xl scale-105' : 'bg-white/5 border-white/5 text-gray-500'}`}>{a}</button>))}
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[11px] text-gray-500 font-black uppercase tracking-widest px-1">Qtd. Jogadores (9-max, 6-max...)</label>
                <div className="grid grid-cols-4 gap-2">
                   {[2, 4, 6, 9].map(n => (
                     <button key={n} onClick={() => setPlayerCount(n)} className={`py-4 rounded-2xl border text-xs font-black transition-all ${playerCount === n ? 'bg-emerald-600 border-emerald-400' : 'bg-white/5 border-white/5 text-gray-500'}`}>{n}</button>
                   ))}
                </div>
              </div>
            </div>

            {/* Stack Configuration */}
            <div className="space-y-6 bg-white/5 p-8 rounded-[32px] border border-white/10">
               <div className="flex justify-between items-center mb-2">
                  <label className="text-[11px] text-gray-500 font-black uppercase tracking-widest px-1">Configuração de Stacks</label>
                  <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                    <button 
                      onClick={() => setStackMode('equal')} 
                      className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${stackMode === 'equal' ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      Stacks Iguais
                    </button>
                    <button 
                      onClick={() => setStackMode('different')} 
                      className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${stackMode === 'different' ? 'bg-sky-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      Stacks Diferentes
                    </button>
                  </div>
               </div>

               {stackMode === 'equal' ? (
                 <div className="space-y-3 animate-in fade-in duration-300">
                    <p className="text-[10px] text-gray-500 font-bold px-1">Defina o stack efetivo que será aplicado a todos os jogadores da mesa.</p>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={stackBB} 
                        onChange={(e) => setStackBB(parseFloat(e.target.value) || 0)} 
                        className="w-full bg-black/40 border border-white/10 rounded-[20px] py-5 px-8 text-white font-black text-xl outline-none focus:border-emerald-500/50" 
                      />
                      <span className="absolute right-8 top-1/2 -translate-y-1/2 text-emerald-500 font-black text-xs uppercase tracking-widest">Big Blinds</span>
                    </div>
                 </div>
               ) : (
                 <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                    <p className="text-[10px] text-gray-500 font-bold px-1">Defina o stack individual (em BB) para cada posição da mesa.</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                       {availablePositions.map(pos => (
                         <div key={pos} className="space-y-2">
                           <div className="flex items-center gap-2 px-1">
                             <div className={`w-1.5 h-1.5 rounded-full ${pos === heroPos ? 'bg-sky-500' : 'bg-gray-600'}`}></div>
                             <label className={`text-[9px] font-black uppercase tracking-widest ${pos === heroPos ? 'text-sky-400' : 'text-gray-500'}`}>{pos}</label>
                           </div>
                           <input 
                             type="number" 
                             value={individualStacks[pos] || stackBB} 
                             onChange={(e) => handleIndividualStackChange(pos, e.target.value)}
                             className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white font-black text-xs outline-none focus:border-sky-500/50"
                           />
                         </div>
                       ))}
                    </div>
                 </div>
               )}
            </div>

            {/* Gerenciamento de Botões de Ação */}
            <div className="space-y-4 col-span-full bg-white/5 p-8 rounded-[32px] border border-white/10">
               <div className="flex justify-between items-center mb-4">
                  <label className="text-[11px] text-gray-500 font-black uppercase tracking-widest px-1">Ações do Herói (Botões na Mesa)</label>
                  <span className="text-[9px] text-sky-500 font-black uppercase tracking-widest">Defina os rótulos que aparecerão na mesa</span>
               </div>
               <div className="flex flex-wrap gap-3 mb-6">
                  {customActions.map((act, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-black/40 border border-white/10 px-5 py-3 rounded-2xl transition-all hover:border-white/20">
                      <div className="w-3 h-3 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.2)]" style={{ backgroundColor: getActionColor(act, idx) }}></div>
                      <span className="text-[11px] font-black text-white uppercase tracking-wider">{act}</span>
                      <button onClick={() => setCustomActions(prev => prev.filter(a => a !== act))} className="ml-2 text-gray-600 hover:text-red-500 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                  {customActions.length === 0 && <p className="text-[10px] text-gray-600 font-bold uppercase italic p-2">Nenhuma ação customizada. Usando padrão do Spot.</p>}
               </div>
               <div className="flex gap-3">
                  <input
                    type="text"
                    value={newActionInput}
                    onChange={(e) => setNewActionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newActionInput.trim()) {
                          setCustomActions(prev => [...prev, newActionInput.trim()]);
                          setNewActionInput('');
                        }
                      }
                    }}
                    placeholder="Adicionar botão (ex: Raise 2.5, All-In, Check)"
                    className="flex-1 bg-black/60 border border-white/10 rounded-2xl py-4 px-6 text-white text-xs font-bold outline-none focus:border-sky-500/50 shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newActionInput.trim()) {
                        setCustomActions(prev => [...prev, newActionInput.trim()]);
                        setNewActionInput('');
                      }
                    }}
                    className="px-8 py-4 bg-sky-600 border border-sky-400 rounded-2xl text-white font-black text-[10px] uppercase tracking-widest hover:bg-sky-500 transition-all shadow-xl active:scale-95"
                  >
                    Adicionar
                  </button>
               </div>
            </div>

            {isReRaiseAction && (
              <div className="bg-orange-500/5 border border-orange-500/20 p-8 rounded-[32px] space-y-4 animate-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <label className="text-[11px] text-orange-400 font-black uppercase tracking-widest">Inteligência de Confronto</label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <p className="text-[10px] text-gray-500 font-bold leading-relaxed">Defina o tamanho do raise que o oponente fará antes da sua vez. O sistema exibirá essa aposta no seat do primeiro vilão selecionado.</p>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest block">Tamanho do Raise do Vilão (BB)</label>
                    <input type="number" step="0.1" value={opponentBetSize} onChange={(e) => setOpponentBetSize(parseFloat(e.target.value) || 0)} className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-white font-black text-sm outline-none focus:border-orange-500/50" />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-5">
                <label className="text-[11px] text-gray-500 font-black uppercase tracking-widest block text-center">Posição do Herói</label>
                <div className="flex flex-wrap justify-center gap-2">
                  {availablePositions.map(pos => (<button key={pos} onClick={() => setHeroPos(pos)} className={`w-14 h-14 rounded-2xl border text-[11px] font-black transition-all ${pos === heroPos ? 'bg-sky-600 border-sky-400 text-white shadow-lg' : 'bg-black/40 border-white/10 text-gray-600'}`}>{pos}</button>))}
                </div>
              </div>
              <div className="space-y-5">
                <label className="text-[11px] text-gray-500 font-black uppercase tracking-widest block text-center">Oponente(s) no Pote</label>
                <div className="flex flex-wrap justify-center gap-2">
                  {availablePositions.map(pos => (<button key={pos} onClick={() => toggleOpponent(pos)} disabled={pos === heroPos} className={`w-14 h-14 rounded-2xl border text-[11px] font-black transition-all ${opponents.includes(pos) ? 'bg-orange-600 border-orange-400 text-white shadow-lg' : 'bg-black/40 border-white/10 text-gray-600 disabled:opacity-20'}`}>{pos}</button>))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex-1 flex flex-col md:flex-row overflow-y-auto custom-scrollbar p-10 gap-10 animate-in fade-in duration-500">
             <div className="flex-1 bg-black/60 rounded-[40px] border border-white/5 p-8 flex flex-col items-center justify-center shadow-inner relative group min-h-[600px]">
              <div onContextMenu={(e) => e.preventDefault()} className="grid grid-cols-13 gap-0 aspect-square w-full max-w-[650px] shadow-2xl overflow-hidden rounded-lg bg-[#111]">
                {RANKS.map((r1, row) => RANKS.map((r2, col) => {
                    let hand = row === col ? r1 + r2 : row < col ? r1 + r2 + 's' : r2 + r1 + 'o';
                    return (<div key={hand} onMouseDown={(e) => handleMouseDown(hand, e)} onMouseEnter={() => handleMouseEnter(hand)} style={getCellStyles(hand)} className="relative flex items-center justify-center text-[10px] font-black cursor-crosshair select-none transition-transform hover:scale-[1.12] hover:z-50 hover:shadow-2xl border-0"><span className="relative z-10">{hand}</span></div>);
                }))}
              </div>
            </div>

            <div className="w-full md:w-[340px] flex flex-col gap-6 shrink-0">
               <section className="bg-white/5 p-7 rounded-[32px] border border-white/10 space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Pintar Estratégia</label>
                    <button type="button" onClick={() => setIsEraserMode(!isEraserMode)} className={`p-2.5 rounded-xl border transition-all ${isEraserMode ? 'bg-red-600 border-red-400 text-white shadow-lg' : 'bg-white/5 border-white/10 text-gray-500'}`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 21l-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" strokeLinecap="round" strokeLinejoin="round" /><path d="M22 21H7" strokeLinecap="round" strokeLinejoin="round" /><path d="m5 11l9 9" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {availableRangeActions.map((a, idx) => (
                      <button key={a} type="button" onClick={() => { setSelectedAction(a); setIsEraserMode(false); }} className={`w-full py-4 rounded-2xl border text-[11px] font-black uppercase tracking-widest transition-all text-left px-5 flex items-center justify-between ${selectedAction === a && !isEraserMode ? 'bg-white border-white text-black shadow-xl' : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getActionColor(a, idx) }}></div>
                          {a}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                   <div className="flex justify-between items-center"><label className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Frequência</label><span className="text-sky-400 font-mono font-black text-xl">{selectedFrequency}%</span></div>
                   <input type="range" min="0" max="100" step="5" value={selectedFrequency} onChange={(e) => setSelectedFrequency(parseInt(e.target.value))} className="w-full h-1.5 bg-black/60 rounded-full appearance-none cursor-pointer accent-sky-500" />
                </div>
                
                {/* Inputs de Range por Texto */}
                <div className="pt-4 border-t border-white/5 space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block">Range por Texto (ex: AA-TT, 55+, AKs)</label>
                    <div className="flex gap-2">
                      <input type="text" value={rangeText} onChange={(e) => setRangeText(e.target.value.toUpperCase())} placeholder="AA-TT, 55+, AKs" className="flex-1 bg-black/40 border border-white/10 rounded-xl py-2 px-4 text-white text-[10px] outline-none focus:border-sky-500/50" />
                      <button type="button" onClick={parseRangeText} className="bg-sky-600 px-4 rounded-xl text-white text-[10px] font-black uppercase shadow-lg hover:bg-sky-500 active:scale-95 transition-all">Add</button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block">Range por Naipes (ex: AhKd, AsKs)</label>
                    <div className="flex gap-2">
                      <input type="text" value={suitRangeText} onChange={(e) => setSuitRangeText(e.target.value)} placeholder="AhKd, AsKs" className="flex-1 bg-black/40 border border-white/10 rounded-xl py-2 px-4 text-white text-[10px] outline-none focus:border-sky-500/50" />
                      <button type="button" onClick={parseSuitRangeText} className="bg-sky-600 px-4 rounded-xl text-white text-[10px] font-black uppercase shadow-lg hover:bg-sky-500 active:scale-95 transition-all">Add</button>
                    </div>
                  </div>
                  {/* Novo Input GTO Wizard */}
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block">GTO Wizard (ex: 5d5c: 1, Tc9c: 0.85)</label>
                    <div className="flex flex-col gap-2">
                      <textarea 
                        value={gtoWizardText} 
                        onChange={(e) => setGtoWizardText(e.target.value)} 
                        placeholder="Cole o código do GTO Wizard aqui..." 
                        className="w-full h-24 bg-black/40 border border-white/10 rounded-xl py-2 px-4 text-white text-[10px] outline-none focus:border-sky-500/50 resize-none custom-scrollbar" 
                      />
                      <button 
                        type="button" 
                        onClick={parseGtoWizardRange} 
                        className="w-full bg-sky-600 py-2 rounded-xl text-white text-[10px] font-black uppercase shadow-lg hover:bg-sky-500 active:scale-95 transition-all"
                      >
                        Importar GTO Wizard
                      </button>
                    </div>
                  </div>
                </div>
              </section>
              
              <button 
                type="button"
                onClick={onClearMatrixClick}
                className="w-full py-4 rounded-2xl bg-red-600/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all shadow-xl active:scale-95"
              >
                Limpar Matriz
              </button>
            </div>
          </div>
        )}

        <div className="px-12 py-10 border-t border-white/5 bg-black/50 flex gap-6 shrink-0">
          <button type="button" onClick={() => step === 2 || step === 'manage' ? setStep(1) : onClose()} className="flex-1 py-6 rounded-[24px] border border-white/10 text-[12px] font-black uppercase tracking-[0.3em] text-gray-500 hover:text-white transition-all">{step === 1 ? 'CANCELAR' : 'RETORNAR'}</button>
          {step !== 'manage' && <button type="button" onClick={() => step === 1 ? setStep(2) : handleFinish()} className={`flex-[1.5] py-6 rounded-[24px] border text-[12px] font-black uppercase tracking-[0.3em] text-white shadow-2xl transition-all flex items-center justify-center gap-4 ${step === 1 ? 'bg-emerald-600 border-emerald-400' : 'bg-sky-600 border-sky-400'}`}>{step === 1 ? 'CONFIGURAR MATRIZ GTO' : 'SALVAR CENÁRIO'}</button>}
        </div>
      </div>
    </div>
  );
};

export default ScenarioCreatorModal;
