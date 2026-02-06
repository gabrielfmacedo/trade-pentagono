
import React from 'react';
import { RangeData, ActionFrequency } from '../types.ts';

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

const CUSTOM_PALETTE = [
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#84cc16', // Lime
  '#6366f1', // Indigo
  '#14b8a6', // Teal
];

const getActionColor = (label: string, index: number): string => {
  const l = label.toLowerCase();
  if (l.includes('fold')) return '#334155';
  if (l.includes('call') || l.includes('pagar') || l === 'limp') return '#0ea5e9';
  if (l.includes('raise') || l === 'rfi' || l.includes('3-bet') || l.includes('4-bet') || l.includes('aumentar')) return '#10b981';
  if (l.includes('all-in') || l.includes('shove')) return '#ef4444';
  
  return CUSTOM_PALETTE[index % CUSTOM_PALETTE.length];
};

const EMPTY_CELL_BG = '#111111';

interface RangeMatrixProps {
  ranges?: RangeData;
  customActions?: string[];
}

const RangeMatrix: React.FC<RangeMatrixProps> = ({ ranges = {}, customActions = ['Fold', 'Call', 'Raise', 'All-In'] }) => {
  const getCellStyles = (handKey: string) => {
    const r1 = handKey[0];
    const r2 = handKey[1];
    const isSuited = handKey.endsWith('s');
    const isPair = handKey.length === 2;
    const totalCombosCount = isPair ? 6 : (isSuited ? 4 : 12);
    
    const handData = ranges[handKey];
    
    // Agrega dados de combos específicos se houver
    const comboEntries = Object.entries(ranges).filter(([k]) => {
       if (k.length !== 4) return false;
       const cr1 = k[0];
       const cr2 = k[2];
       const cs1 = k[1];
       const cs2 = k[3];

       const ranksMatch = (cr1 === r1 && cr2 === r2) || (cr1 === r2 && cr2 === r1);
       if (!ranksMatch) return false;

       if (isPair) return cr1 === cr2;
       if (isSuited) return cs1 === cs2;
       return cs1 !== cs2;
    });

    const aggregated: ActionFrequency = {};
    
    if (handData) {
       Object.entries(handData).forEach(([act, freq]) => {
          aggregated[act] = (aggregated[act] || 0) + (freq as number);
       });
    } else if (comboEntries.length > 0) {
       comboEntries.forEach(([_, data]) => {
          Object.entries(data).forEach(([act, freq]) => {
             aggregated[act] = (aggregated[act] || 0) + ((freq as number) / totalCombosCount);
          });
       });
    }

    if (Object.keys(aggregated).length === 0) {
      return { backgroundColor: EMPTY_CELL_BG, color: '#444' };
    }

    const entries = Object.entries(aggregated).sort((a, b) => {
      if (a[0] === 'Fold') return 1;
      if (b[0] === 'Fold') return -1;
      return 0;
    });

    let cumulative = 0;
    const gradientParts = entries.map(([act, freq]) => {
      const start = cumulative;
      cumulative += freq;
      
      const actionIdx = customActions.indexOf(act);
      const color = getActionColor(act, actionIdx !== -1 ? actionIdx : 0);
      
      return `${color} ${start}% ${cumulative}%`;
    });

    if (cumulative < 99.9) {
      gradientParts.push(`${EMPTY_CELL_BG} ${cumulative}% 100%`);
    }

    const foldFreq = aggregated['Fold'] || 0;
    const textColor = foldFreq > 70 ? '#94a3b8' : 'white';

    return {
      background: entries.length > 0 ? `linear-gradient(to right, ${gradientParts.join(', ')})` : EMPTY_CELL_BG,
      color: textColor
    };
  };

  return (
    <div className="w-full aspect-square bg-[#0a0a0a] rounded-lg border border-white/5 p-1 overflow-hidden shadow-2xl">
      <div className="grid grid-cols-13 h-full w-full gap-[1px]">
        {RANKS.map((r1, row) => 
          RANKS.map((r2, col) => {
            const isPair = row === col;
            const isSuited = col > row;
            const label = isPair ? r1 + r2 : isSuited ? r1 + r2 + 's' : r2 + r1 + 'o';
            const styles = getCellStyles(label);

            return (
              <div 
                key={label}
                style={styles}
                className="relative flex items-center justify-center text-[5px] sm:text-[7px] font-bold transition-all duration-300 hover:scale-110 hover:z-20 hover:shadow-xl cursor-default"
                title={label}
              >
                {label}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default RangeMatrix;