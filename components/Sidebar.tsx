
import React, { useState } from 'react';
import RangeMatrix from './RangeMatrix.tsx';
import { HandRecord, RangeData, TrainingGoal } from '../types.ts';

interface SidebarProps {
  isOpen: boolean;
  isPinned: boolean;
  onToggle: () => void;
  onTogglePin: () => void;
  onToggleFocusMode: () => void;
  onStopTreino: () => void;
  onRestartTreino: () => void;
  onShowSpotInfo: () => void;
  onShowConfig: () => void;
  onShowScenarioCreator?: () => void;
  onShowAdminMember?: () => void;
  onBackToSelection?: () => void;
  onLogout?: () => void;
  currentUser?: string | null;
  history: HandRecord[];
  ranges?: RangeData;
  customActions?: string[];
  trainingGoal?: TrainingGoal;
  sessionElapsedSeconds: number;
}

const CUSTOM_PALETTE = [
  '#f59e0b', // Amber/Gold (Padrão para o primeiro Raise)
  '#8b5cf6', // Violeta
  '#ec4899', // Rosa
  '#06b6d4', // Ciano
  '#f97316', // Laranja
  '#84cc16', // Lima
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#f43f5e', // Rose
  '#0ea5e9', // Sky
];

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  isPinned,
  onToggle, 
  onTogglePin,
  onToggleFocusMode,
  onStopTreino, 
  onRestartTreino, 
  onShowSpotInfo, 
  onShowConfig,
  onShowScenarioCreator,
  onShowAdminMember,
  currentUser,
  history,
  ranges,
  customActions = ['Fold', 'Raise'],
  trainingGoal,
  sessionElapsedSeconds
}) => {
  // Alterado para null para que todas as seções iniciem fechadas
  const [activeAccordion, setActiveAccordion] = useState<string | null>(null);

  const toggleAccordion = (id: string) => {
    setActiveAccordion(activeAccordion === id ? null : id);
  };

  if (!isOpen) {
    return (
      <button 
        onClick={onToggle}
        className="fixed left-6 top-6 z-[101] w-12 h-12 bg-emerald-600 border border-emerald-400 text-white rounded-2xl flex items-center justify-center hover:bg-emerald-500 transition-all shadow-[0_8px_20px_rgba(16,185,129,0.3)] active:scale-90 animate-in fade-in zoom-in"
        title="Abrir Menu"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M3 12h18M3 6h18M3 6h18M3 18h18" strokeLinecap="round" />
        </svg>
      </button>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const correctCount = history.filter(h => h.status === 'correct').length;
  const incorrectCount = history.filter(h => h.status === 'incorrect').length;
  const precision = history.length > 0 ? Math.round((correctCount / history.length) * 100) : 0;

  const isAdmin = currentUser === 'gabrielfmacedo@ymail.com';

  let progressPercent = 0;
  let progressText = "";

  if (trainingGoal) {
    if (trainingGoal.type === 'hands') {
      progressPercent = (history.length / trainingGoal.value) * 100;
      progressText = `${history.length} / ${trainingGoal.value} mãos`;
    } else if (trainingGoal.type === 'time') {
      const targetSeconds = trainingGoal.value * 60;
      progressPercent = (sessionElapsedSeconds / targetSeconds) * 100;
      progressText = `${formatTime(sessionElapsedSeconds)} / ${formatTime(targetSeconds)}`;
    } else {
      progressPercent = 0;
      progressText = `${history.length} mãos jogadas`;
    }
  }

  return (
    <div className="fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-[#0f0f0f] border-r border-white/5 z-[100] flex flex-col shadow-2xl animate-in slide-in-from-left duration-300">
      <div className="p-5 border-b border-white/5 flex justify-between items-start shrink-0">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
             <svg viewBox="0 0 100 100" className="w-6 h-6 text-emerald-500 drop-shadow-md">
                <path d="M50 8 L92 38 L76 88 L24 88 L8 38 Z" fill="none" stroke="currentColor" strokeWidth="8" />
                <g transform="translate(50, 52)">
                  <circle cx="0" cy="0" r="16" fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="5 3" />
                  <circle cx="0" cy="0" r="10" fill="#f59e0b" />
                </g>
             </svg>
             <h2 className="text-emerald-500 font-black text-[10px] tracking-widest uppercase">PRO TRAINING</h2>
          </div>
          <h1 className="text-white font-bold text-lg leading-tight uppercase">PENTÁGONO</h1>
          <p className="text-gray-500 text-[11px] mt-1">Sessão Ativa</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={onTogglePin} 
            className={`p-2.5 transition-all rounded-xl border ${isPinned ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={isPinned ? '' : 'rotate-45'}>
               <path d="M12 2v8m0 0l-4 4m4-4l4 4m-4 10v-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          
          <button 
            onClick={onToggle} 
            className="p-2.5 text-gray-500 hover:text-white transition-colors bg-white/5 rounded-xl border border-white/10"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex flex-col shrink-0">
        {/* Bloco de Progresso - SEMPRE VISÍVEL */}
        <div className="p-5 bg-black/20 border-b border-white/5">
          <div className="flex justify-between items-end mb-2">
            <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Progresso</span>
            <span className="text-xs font-mono text-white">{progressText}</span>
          </div>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-500" 
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* 1. Gestão de Treino */}
        <section className="border-b border-white/5">
          <button onClick={() => toggleAccordion('gestao')} className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]"></div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-300">Gestão de Treino</span>
            </div>
            <svg className={`transition-transform ${activeAccordion === 'gestao' ? 'rotate-180' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" />
            </svg>
          </button>
          {activeAccordion === 'gestao' && (
            <div className="p-4 pt-0 grid grid-cols-1 gap-2 animate-in slide-in-from-top-2 duration-300">
              <button onClick={onToggleFocusMode} className="hidden lg:flex items-center gap-3 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[11px] font-black uppercase hover:bg-purple-500/20 transition-all mb-1 group">
                <div className="w-6 h-6 bg-purple-600 rounded-md flex items-center justify-center text-white shadow-lg">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                </div>
                Modo Foco
              </button>
              {isAdmin && (
                <>
                  <button onClick={onShowAdminMember} className="w-full flex items-center justify-center p-3 rounded-xl bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-black uppercase hover:bg-emerald-600/20 transition-all">
                    MEMBROS
                  </button>
                  <button onClick={onShowScenarioCreator} className="w-full flex items-center justify-center p-3 rounded-xl bg-amber-600/10 border border-amber-500/30 text-amber-400 text-[11px] font-black uppercase hover:bg-amber-600/20 transition-all">
                    CENÁRIOS
                  </button>
                </>
              )}
              <button onClick={onShowConfig} className="flex items-center justify-center p-2.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-[11px] font-bold uppercase hover:bg-white/10 transition-all">Configuração</button>
              <button onClick={onStopTreino} className="flex items-center justify-center p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-bold uppercase hover:bg-red-500/20 transition-all">Parar Treino</button>
              <button onClick={onRestartTreino} className="flex items-center justify-center p-2.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-[11px] font-bold uppercase hover:bg-white/10 transition-all">Reiniciar</button>
            </div>
          )}
        </section>

        {/* 2. Performance */}
        <section className="border-b border-white/5">
          <button onClick={() => toggleAccordion('performance')} className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-sky-500 shadow-[0_0_5px_#0ea5e9]"></div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-300">Performance</span>
            </div>
            <svg className={`transition-transform ${activeAccordion === 'performance' ? 'rotate-180' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" />
            </svg>
          </button>
          {activeAccordion === 'performance' && (
            <div className="p-5 pt-0 animate-in slide-in-from-top-2 duration-300">
              <div className="flex justify-between items-end mb-3">
                <span className="text-[9px] text-sky-400 font-black tracking-widest uppercase">{precision}% <span className="text-gray-600 ml-1">PRECISÃO</span></span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex flex-col">
                  <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mb-1">Acertos</span>
                  <span className="text-sm font-black text-emerald-500">{correctCount}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mb-1">Erros</span>
                  <span className="text-sm font-black text-red-500">{incorrectCount}</span>
                </div>
              </div>

              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden flex shadow-inner">
                {history.length > 0 ? (
                  <>
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
                      style={{ width: `${precision}%` }}
                    ></div>
                    <div 
                      className="h-full bg-red-600 transition-all duration-500 shadow-[0_0_10px_rgba(220,38,38,0.3)]" 
                      style={{ width: `${100 - precision}%` }}
                    ></div>
                  </>
                ) : (
                  <div className="w-full h-full bg-white/5"></div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* 3. Histórico de Mãos */}
        <section className="border-b border-white/5">
          <button onClick={() => toggleAccordion('historico')} className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_5px_#6366f1]"></div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-300">Histórico de Mãos</span>
            </div>
            <svg className={`transition-transform ${activeAccordion === 'historico' ? 'rotate-180' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" />
            </svg>
          </button>
          {activeAccordion === 'historico' && (
            <div className="p-4 pt-0 space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2 duration-300">
              {history.length === 0 ? (
                <p className="text-center py-8 text-[10px] text-gray-600 font-black uppercase tracking-widest">Nenhuma mão jogada</p>
              ) : (
                [...history].reverse().map((hand) => (
                  <div key={hand.id} className={`p-3 rounded-xl border flex items-center justify-between transition-all ${hand.status === 'correct' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-mono font-black text-white">{hand.cards}</span>
                      <span className="text-[9px] text-gray-500 uppercase font-bold">{hand.timestamp}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${hand.status === 'correct' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {hand.action}
                      </span>
                      {hand.status === 'incorrect' && (
                        <span className="text-[8px] text-gray-600 uppercase font-black">Correto: {hand.correctAction}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        {/* 4. Estratégia */}
        <section className="border-b border-white/5">
          <button onClick={() => toggleAccordion('estrategia')} className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_5px_#f59e0b]"></div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-300">Estratégia</span>
            </div>
            <svg className={`transition-transform ${activeAccordion === 'estrategia' ? 'rotate-180' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" />
            </svg>
          </button>
          {activeAccordion === 'estrategia' && (
            <div className="p-4 pt-0 animate-in slide-in-from-top-2 duration-300">
               <RangeMatrix ranges={ranges} customActions={customActions} />
            </div>
          )}
        </section>
      </div>
      <div className="p-4 border-t border-white/5 text-center shrink-0">
        <span className="text-[9px] text-gray-600 font-black tracking-[0.2em] uppercase">PENTÁGONO v1.1</span>
      </div>
    </div>
  );
};

export default Sidebar;
