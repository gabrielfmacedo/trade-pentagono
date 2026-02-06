import React from 'react';
import { TimeBankOption } from '../types.ts';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  timeBank: TimeBankOption;
  setTimeBank: (val: TimeBankOption) => void;
}

const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose, timeBank, setTimeBank }) => {
  if (!isOpen) return null;

  const options: TimeBankOption[] = ['OFF', 7, 15, 25];

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0f0f0f] w-full max-w-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="p-5 border-b border-white/5 flex justify-between items-center">
          <h2 className="text-white font-black text-xs uppercase tracking-widest">Configurações do Treino</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-8 space-y-8">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 bg-sky-500 rounded-full"></div>
              <h3 className="text-white font-bold text-sm uppercase tracking-tight">Time Bank</h3>
            </div>
            <p className="text-gray-500 text-[11px] mb-4 leading-relaxed"> Defina o tempo máximo para tomar cada decisão. Se o tempo esgotar, o sistema executará um FOLD automático.</p>
            
            <div className="grid grid-cols-4 gap-2">
              {options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setTimeBank(opt)}
                  className={`py-3 rounded-xl border text-[10px] font-black transition-all ${
                    timeBank === opt 
                      ? 'bg-sky-600 border-sky-400 text-white shadow-[0_0_15px_rgba(14,165,233,0.3)]' 
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {opt === 'OFF' ? 'OFF' : `${opt}s`}
                </button>
              ))}
            </div>
          </section>

          <div className="pt-4">
             <button 
              onClick={onClose}
              className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all"
             >
               Salvar e Voltar
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigModal;