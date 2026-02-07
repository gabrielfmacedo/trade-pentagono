
import React, { useState, useMemo } from 'react';
import { Scenario } from '../types.ts';

interface SelectionScreenProps {
  scenarios: Scenario[];
  onSelect: (s: Scenario) => void;
  onCreateNew: () => void;
  isAdmin?: boolean;
}

const SelectionScreen: React.FC<SelectionScreenProps> = ({ scenarios, onSelect, onCreateNew, isAdmin = false }) => {
  const [filterStreet, setFilterStreet] = useState<string>('ALL');
  const [filterStack, setFilterStack] = useState<string>('ALL');
  const [filterSpot, setFilterSpot] = useState<string>('ALL');
  const [filterPlayers, setFilterPlayers] = useState<string>('ALL');
  const [filterPos, setFilterPos] = useState<string>('ALL');

  // Dados dinâmicos extraídos dos cenários cadastrados
  // Fix: Explicitly type sort parameters to avoid arithmetic operation errors
  const uniqueStacks = useMemo(() => Array.from(new Set(scenarios.map(s => s.stackBB))).sort((a: number, b: number) => a - b), [scenarios]);
  const uniqueSpots = useMemo(() => {
    const spots = new Set(scenarios.map(s => s.preflopAction.toUpperCase()));
    // Garante que as opções solicitadas apareçam se existirem nos dados (independente de case)
    return Array.from(spots).sort();
  }, [scenarios]);
  // Fix: Ensure numeric types for sort parameters to avoid arithmetic operation errors
  const uniquePlayers = useMemo(() => Array.from(new Set(scenarios.map(s => s.playerCount))).sort((a: number, b: number) => b - a), [scenarios]);
  const uniquePositions = useMemo(() => Array.from(new Set(scenarios.map(s => s.heroPos))).sort(), [scenarios]);

  const filteredScenarios = useMemo(() => {
    return scenarios.filter(s => {
      const matchStreet = filterStreet === 'ALL' || s.street === filterStreet;
      const matchStack = filterStack === 'ALL' || s.stackBB.toString() === filterStack;
      const matchSpot = filterSpot === 'ALL' || s.preflopAction.toUpperCase() === filterSpot;
      const matchPlayers = filterPlayers === 'ALL' || s.playerCount.toString() === filterPlayers;
      const matchPos = filterPos === 'ALL' || s.heroPos === filterPos;
      return matchStreet && matchStack && matchSpot && matchPlayers && matchPos;
    });
  }, [scenarios, filterStreet, filterStack, filterSpot, filterPlayers, filterPos]);

  const clearFilters = () => {
    setFilterStreet('ALL'); setFilterStack('ALL'); setFilterSpot('ALL'); setFilterPlayers('ALL'); setFilterPos('ALL');
  };

  const hasActiveFilters = filterStreet !== 'ALL' || filterStack !== 'ALL' || filterSpot !== 'ALL' || filterPlayers !== 'ALL' || filterPos !== 'ALL';

  return (
    <div className="h-full w-full bg-[#050505] text-white p-4 md:p-12 flex flex-col animate-in fade-in duration-500 overflow-hidden">
      <div className="max-w-7xl mx-auto w-full flex flex-col h-full min-h-0">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mb-6 md:mb-8 shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-2">
               <svg viewBox="0 0 100 100" className="w-8 h-8 text-emerald-500">
                  <path d="M50 8 L92 38 L76 88 L24 88 L8 38 Z" fill="none" stroke="currentColor" strokeWidth="6" />
                  <g transform="translate(50, 52)">
                    <circle cx="0" cy="0" r="16" fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="5 3" />
                    <circle cx="0" cy="0" r="10" fill="#f59e0b" />
                  </g>
               </svg>
               <h1 className="text-2xl md:text-4xl font-black tracking-tighter uppercase mb-0">PENTÁGONO TRADE</h1>
            </div>
            <p className="text-gray-500 font-bold tracking-widest uppercase text-[9px] md:text-[10px]"> • SIMULADORES DE CENÁRIOS</p>
          </div>
          
          {isAdmin && (
            <button 
              onClick={onCreateNew}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 border border-emerald-400 rounded-xl flex items-center gap-3 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">Novo Cenário</span>
            </button>
          )}
        </div>

        <div className="bg-[#0f0f0f] border border-white/5 rounded-[24px] md:rounded-[32px] p-4 md:p-6 mb-6 md:mb-8 shrink-0 shadow-2xl overflow-x-auto no-scrollbar">
          <div className="flex flex-row md:flex-wrap items-end gap-4 md:gap-6 min-w-max md:min-w-0">
            {/* Filtro Street: Mantido */}
            <div className="flex flex-col gap-2">
              <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest ml-1">Street</label>
              <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                {['ALL', 'PREFLOP', 'FLOP'].map(s => (
                  <button key={s} onClick={() => setFilterStreet(s)} className={`px-4 py-2 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${filterStreet === s ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>
                    {s === 'ALL' ? 'Todas' : s === 'PREFLOP' ? 'Pré' : 'Flop'}
                  </button>
                ))}
              </div>
            </div>

            {/* Filtro Stack: Dinâmico baseado nos cenários */}
            <div className="flex flex-col gap-2">
              <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest ml-1">Stack (BB)</label>
              <select value={filterStack} onChange={(e) => setFilterStack(e.target.value)} className="bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest outline-none focus:border-emerald-500/50 transition-all text-gray-300 min-w-[120px]">
                <option value="ALL">Todos Stacks</option>
                {uniqueStacks.map(stack => (
                  <option key={stack} value={stack.toString()}>{stack} BB</option>
                ))}
              </select>
            </div>

            {/* Filtro Ação (Spot): Dinâmico + Opções Específicas */}
            <div className="flex flex-col gap-2">
              <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest ml-1">Ação / Spot</label>
              <select value={filterSpot} onChange={(e) => setFilterSpot(e.target.value)} className="bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest outline-none focus:border-emerald-500/50 transition-all text-gray-300 min-w-[140px]">
                <option value="ALL">Todas Ações</option>
                {/* Opções específicas solicitadas aparecem no topo da lista se existirem em qualquer formato no BD */}
                {uniqueSpots.map(spot => (
                  <option key={spot} value={spot}>{spot}</option>
                ))}
              </select>
            </div>

            {/* Filtro Hero Position: Dinâmico baseado nos cenários */}
            <div className="flex flex-col gap-2">
              <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest ml-1">Posição Herói</label>
              <select value={filterPos} onChange={(e) => setFilterPos(e.target.value)} className="bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest outline-none focus:border-emerald-500/50 transition-all text-gray-300 min-w-[100px]">
                <option value="ALL">Todas</option>
                {uniquePositions.map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>

            <button onClick={clearFilters} disabled={!hasActiveFilters} className={`h-[42px] px-6 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${hasActiveFilters ? 'bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20' : 'bg-white/5 border border-white/5 text-gray-600 cursor-not-allowed'}`}>Limpar Filtros</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pb-8 pr-1 md:pr-2 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredScenarios.map((s) => (
              <div key={s.id} onClick={() => onSelect(s)} className="group relative bg-[#0f0f0f] border border-white/5 rounded-[32px] overflow-hidden cursor-pointer hover:border-emerald-500/50 transition-all shadow-xl flex flex-col h-[280px]">
                <div className="p-8 flex-1 flex flex-col pt-10">
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${s.street === 'PREFLOP' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'}`}>{s.street === 'PREFLOP' ? 'Pré-Flop' : 'Flop'}</span>
                      <span className="text-gray-600 text-[12px]">•</span>
                      <span className="text-amber-500 text-[9px] font-black tracking-[0.2em] uppercase">{s.preflopAction}</span>
                    </div>
                    <h3 className="text-xl font-black leading-tight group-hover:text-emerald-400 transition-colors uppercase truncate">{s.name}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-auto">
                    <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5 flex flex-col items-center">
                      <span className="text-[8px] text-gray-600 font-black uppercase block mb-1 tracking-widest">Stack</span>
                      <span className="text-[12px] font-black text-white">{s.stackBB} BB</span>
                    </div>
                    <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5 flex flex-col items-center">
                      <span className="text-[8px] text-gray-600 font-black uppercase block mb-1 tracking-widest">Herói</span>
                      <span className="text-[12px] font-black text-white">{s.heroPos}</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-emerald-600/10 border-t border-white/5 flex items-center justify-center">
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 group-hover:text-emerald-400 transition-colors">Iniciar Treinamento &rarr;</span>
                </div>
              </div>
            ))}
          </div>
          {filteredScenarios.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-600 uppercase">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-4 opacity-20">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className="text-[10px] font-black tracking-widest">Nenhum cenário encontrado para estes filtros</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelectionScreen;
