
import React from 'react';

const MobileWarningOverlay: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[1000] bg-[#050505] flex items-center justify-center p-8 md:hidden">
      <div className="max-w-sm w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
          <div className="absolute inset-0 bg-emerald-500/20 blur-[40px] rounded-full scale-125"></div>
          <svg viewBox="0 0 100 100" className="relative w-full h-full text-emerald-500 drop-shadow-[0_0_20px_rgba(16,185,129,0.4)]">
            <path 
              d="M50 10 L90 38 L75 85 L25 85 L10 38 Z" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="5" 
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <g transform="translate(50, 52)">
              <rect x="-15" y="-22" width="30" height="44" rx="4" fill="none" stroke="#f59e0b" strokeWidth="3" />
              <line x1="-8" y1="15" x2="8" y2="15" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
            </g>
          </svg>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-tight">Experiência Otimizada</h2>
          <div className="h-1 w-12 bg-emerald-500 mx-auto rounded-full"></div>
          <p className="text-gray-400 text-sm font-medium leading-relaxed">
            Para garantir a melhor performance e precisão no estudo de ranges GTO, recomendamos o acesso através de um <span className="text-emerald-400 font-bold">Computador</span>.
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
          <p className="text-[10px] text-sky-400 font-black uppercase tracking-[0.2em]">
            Versão Mobile disponível em breve!
          </p>
        </div>
      </div>
    </div>
  );
};

export default MobileWarningOverlay;
