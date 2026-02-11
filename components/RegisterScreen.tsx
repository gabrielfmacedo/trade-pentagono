
import React, { useState } from 'react';

interface RegisterScreenProps {
  onRegister: (email: string) => void;
  onGoToLogin: () => void;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ onRegister, onGoToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Preencha todos os campos.');
      return;
    }
    onRegister(email);
  };

  return (
    <div className="w-full min-h-screen bg-[#050505] flex items-center justify-center p-6 animate-in fade-in duration-700">
      <div className="w-full max-w-md">
        <div className="text-center mb-10 flex flex-col items-center">
          {/* Ícone Pentágono de Registro Minimalista com Ficha */}
          <div className="relative w-32 h-32 flex items-center justify-center mb-6">
            <div className="absolute inset-0 bg-emerald-500/10 blur-xl rounded-full scale-125"></div>
            <svg viewBox="0 0 100 100" className="w-[80%] h-[80%] text-emerald-500 drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]">
               <path 
                 d="M50 10 L90 38 L75 85 L25 85 L10 38 Z" 
                 fill="none" 
                 stroke="currentColor" 
                 strokeWidth="5" 
                 strokeLinecap="round"
                 strokeLinejoin="round"
               />
               
               {/* Ficha de Poker Dourada */}
               <g transform="translate(50, 51.5)">
                 <circle 
                    cx="0" cy="0" r="16" 
                    fill="none" 
                    stroke="#f59e0b" 
                    strokeWidth="3" 
                    strokeDasharray="4 2"
                 />
                 <circle 
                    cx="0" cy="0" r="10" 
                    fill="#f59e0b" 
                 />
               </g>
            </svg>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Solicitar Acesso</h1>
          <p className="text-emerald-500 font-bold tracking-[0.2em] uppercase text-[10px]">Junte-se ao PENTÁGONO Poker Trade</p>
        </div>

        <div className="bg-[#0f0f0f] border border-white/5 rounded-[40px] p-10 shadow-2xl relative overflow-hidden">
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest px-1">Nome Completo</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm font-bold outline-none focus:border-emerald-500/50" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest px-1">E-mail</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="exemplo@email.com" className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm font-bold outline-none focus:border-emerald-500/50" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest px-1">Senha</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm font-bold outline-none focus:border-emerald-500/50" />
            </div>
            {error && <div className="text-red-500 text-[10px] font-black uppercase text-center">{error}</div>}
            <button type="submit" className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 border border-emerald-400 rounded-2xl text-xs font-black uppercase tracking-[0.2em] text-white shadow-xl">Enviar Solicitação</button>
          </form>
          <div className="mt-8 text-center relative z-10">
            <button onClick={onGoToLogin} className="text-[10px] text-gray-500 font-bold uppercase tracking-widest hover:text-white transition-colors">Já tem conta? <span className="text-emerald-500">Faça Login</span></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterScreen;
