
import React from 'react';
import { Player, PlayerStatus } from '../types.ts';

interface PlayerSeatProps {
  player: Player;
  isMain?: boolean;
  bigBlindValue?: number;
  className?: string; // 'top' | 'bottom' | 'left' | 'right' | 'left-top' | 'right-top' | 'left-bottom' | 'right-bottom'
  timeRemaining?: number;
  maxTime?: number;
  totalPlayers?: number;
}

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
    case 'c': return 'text-green-600';
    case 'd': return 'text-blue-600';
    case 'h': return 'text-red-600';
    case 's': return 'text-gray-900';
    default: return 'text-black';
  }
};

const PlayerSeat: React.FC<PlayerSeatProps> = ({ 
  player, 
  isMain = false, 
  bigBlindValue = 20,
  className = "bottom",
  timeRemaining = 0,
  maxTime = 0
}) => {
  const isActing = player.status === PlayerStatus.ACTING;
  const isFolded = player.status === PlayerStatus.FOLDED;

  const displayChips = () => (player.chips / bigBlindValue).toFixed(1) + " BB";
  const displayBet = () => (player.betAmount && player.betAmount > 0) ? (player.betAmount / bigBlindValue).toFixed(1) + " BB" : null;

  // Lógica de ancoragem puramente geométrica (Baseada na posição física na mesa)
  const getOverlayPosition = () => {
    switch (className) {
      case 'left-top': return 'left-[105%] top-[90%] -translate-y-1/2';
      case 'right-top': return 'right-[105%] top-[90%] -translate-y-1/2';
      case 'left-bottom': return 'left-[105%] top-[10%] -translate-y-1/2';
      // Para CO (right-bottom), movemos a aposta para cima (top-10%)
      case 'right-bottom': return 'right-[105%] top-[10%] -translate-y-1/2';
      case 'left': return 'left-[105%] top-1/2 -translate-y-1/2';
      case 'right': return 'right-[105%] top-1/2 -translate-y-1/2';
      case 'top': return 'top-[115%] left-1/2 -translate-x-1/2';
      default: return 'bottom-[120%] left-1/2 -translate-x-1/2';
    }
  };

  const getDealerPosition = () => {
    switch (className) {
      case 'left':
      case 'left-top':
      case 'left-bottom': return 'top-[-5px] right-[-5px]';
      case 'right':
      case 'right-top':
      case 'right-bottom': return 'top-[-5px] left-[-5px]';
      case 'top': return 'bottom-[-5px] right-[-5px]';
      default: return 'top-[-5px] left-[-5px]';
    }
  };

  const progress = maxTime > 0 ? (timeRemaining / maxTime) : 0;
  const getTimerColor = () => progress > 0.5 ? 'bg-green-500' : (progress > 0.2 ? 'bg-yellow-500' : 'bg-red-500');

  return (
    <div className={`relative flex flex-col items-center transition-all duration-300 ${isFolded ? 'opacity-30 grayscale' : ''}`}>
      
      {/* Dealer Button */}
      {player.isDealer && (
        <div className={`absolute ${getDealerPosition()} z-50`}>
          <div className="w-6 h-6 bg-white rounded-full border border-slate-300 flex items-center justify-center shadow-lg">
             <span className="text-black text-[10px] font-black">D</span>
          </div>
        </div>
      )}

      {/* Cards */}
      {!isFolded && (
        <div className={`flex items-end transition-transform z-0 ${isMain ? 'gap-1 mb-1' : '-space-x-4 mb-[-2px]'}`}>
           {isMain && player.cards ? (
             player.cards.map((card, i) => (
               <div key={i} className={`w-10 h-14 bg-white rounded shadow-2xl flex flex-col items-center justify-center leading-none ${getSuitColor(card[1])} font-bold border border-gray-300`}>
                 <span className="text-sm font-black">{card[0] === 'T' ? '10' : card[0]}</span>
                 <span className="text-lg">{getSuitSymbol(card[1])}</span>
               </div>
             ))
           ) : (
             <>
               <div className="w-8 h-12 bg-[#1c3c9c] border border-white/20 rounded shadow-lg transform -rotate-12 overflow-hidden" />
               <div className="w-8 h-12 bg-[#1c3c9c] border border-white/20 rounded shadow-lg transform rotate-6 overflow-hidden" />
             </>
           )}
        </div>
      )}

      {/* Player Box */}
      <div className={`
        relative w-28 overflow-hidden rounded-lg border-2 transition-all z-10
        ${isActing ? 'border-sky-400 bg-sky-900/20 shadow-[0_0_15px_rgba(56,189,248,0.4)]' : 'border-white/10 bg-black shadow-2xl'}
      `}>
        <div className="px-2 py-2 flex flex-col items-center gap-1 bg-gradient-to-b from-[#1a1a1a] to-[#050505]">
          <span className={`font-black text-[11px] text-center uppercase tracking-wider ${isActing ? 'text-sky-400' : 'text-gray-300'}`}>
            {player.positionName}
          </span>
          <div className="w-full bg-black/60 rounded border border-white/5 py-1 flex items-center justify-center">
             <span className="text-[#55efc4] font-mono text-[14px] font-black tracking-tighter">
               {displayChips()}
             </span>
          </div>
        </div>

        {isActing && maxTime > 0 && (
          <div className="absolute bottom-0 left-0 w-full h-1 bg-black/50">
            <div className={`h-full transition-all duration-100 linear ${getTimerColor()}`} style={{ width: `${progress * 100}%` }} />
          </div>
        )}
      </div>

      {/* Overlay: Bets (Fixo com base na âncora física) */}
      <div className={`absolute pointer-events-none flex flex-col items-center ${getOverlayPosition()} z-30`}>
        {displayBet() && (
          <div className="flex items-center bg-black/80 rounded-full px-2 py-1 border border-white/10 shadow-xl backdrop-blur-md whitespace-nowrap">
            <div className="w-3 h-3 bg-sky-500 rounded-full border border-white/20" />
            <span className="text-white text-[10px] font-black ml-1.5 uppercase">{displayBet()}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerSeat;
