
import React, { useState } from 'react';

interface LoginScreenProps {
  onLogin: (email: string, remember: boolean) => void;
  onGoToRegister: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onGoToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    const normalizedEmail = email.toLowerCase();
    const storedMembers = JSON.parse(localStorage.getItem('gto_members') || '[]');
    const isAdminEmail = normalizedEmail === 'gabrielfmacedo@ymail.com';
    const isSpecialMemberEmail = normalizedEmail === 'gabrielfpoker@gmail.com';
    const userInDb = storedMembers.find((u: any) => u.email.toLowerCase() === normalizedEmail);

    const performLogin = () => {
       const sessionId = Date.now().toString() + Math.random().toString(36).substring(2);
       const activeSessions = JSON.parse(localStorage.getItem('gto_active_sessions') || '{}');
       
       if (activeSessions[normalizedEmail] && activeSessions[normalizedEmail] !== sessionId) {
         const updatedMembers = storedMembers.map((m: any) => {
           if (m.email.toLowerCase() === normalizedEmail) {
             return { ...m, hasMultiLoginAttempt: true };
           }
           return m;
         });
         localStorage.setItem('gto_members', JSON.stringify(updatedMembers));
       }

       activeSessions[normalizedEmail] = sessionId;
       localStorage.setItem('gto_active_sessions', JSON.stringify(activeSessions));
       sessionStorage.setItem('gto_current_session_id', sessionId);
       onLogin(email, remember);
    };

    if (isAdminEmail || isSpecialMemberEmail) {
       performLogin();
       return;
    }

    if (!userInDb) {
      setError('E-mail não autorizado.');
      return;
    }

    if (userInDb.password !== password) {
      setError('Senha incorreta.');
      return;
    }

    performLogin();
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 animate-in fade-in duration-700">
      <div className="w-full max-w-md">
        <div className="text-center mb-10 flex flex-col items-center">
          {/* Logo PENTÁGONO - Minimalista com Ficha de Poker */}
          <div className="relative mb-10 group">
             <div className="relative w-48 h-48 flex items-center justify-center">
                {/* Glow de Fundo Sutil Verde Dourado */}
                <div className="absolute inset-0 bg-emerald-500/10 blur-[50px] rounded-full scale-125"></div>
                
                {/* Geometria do Pentágono com Ficha */}
                <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full drop-shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                   <defs>
                      <linearGradient id="pentagonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                         <stop offset="0%" stopColor="#10b981" />
                         <stop offset="100%" stopColor="#065f46" />
                      </linearGradient>
                      <linearGradient id="goldHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
                         <stop offset="0%" stopColor="#f59e0b" />
                         <stop offset="100%" stopColor="#d97706" />
                      </linearGradient>
                   </defs>
                   
                   {/* Pentágono Minimalista */}
                   <path 
                     d="M50 8 L92 38 L76 88 L24 88 L8 38 Z" 
                     fill="none" 
                     stroke="url(#pentagonGrad)" 
                     strokeWidth="3.5" 
                     strokeLinecap="round"
                     strokeLinejoin="round"
                   />

                   {/* Ficha de Poker Estilizada */}
                   <g transform="translate(50, 50)">
                     {/* Anel Externo da Ficha (Bordas) */}
                     <circle 
                        cx="0" cy="0" r="18" 
                        fill="none" 
                        stroke="url(#goldHighlight)" 
                        strokeWidth="2.5" 
                        strokeDasharray="5 3"
                        className="opacity-90"
                     />
                     {/* Círculo Interno */}
                     <circle 
                        cx="0" cy="0" r="12" 
                        fill="url(#goldHighlight)" 
                        className="opacity-80"
                     />
                     {/* Detalhe Central (Pequeno Pentágono) */}
                     <path 
                        d="M0 -5 L4.75 -1.54 L2.94 4.04 L-2.94 4.04 L-4.75 -1.54 Z" 
                        fill="#050505" 
                        className="opacity-90"
                     />
                   </g>
                </svg>
             </div>
          </div>
          
          <h1 className="text-5xl font-black text-white tracking-tighter uppercase mb-1 drop-shadow-2xl">PENTÁGONO</h1>
          <p className="text-emerald-500 font-bold tracking-[0.4em] uppercase text-[10px]">POKER TRADE</p>
        </div>

        <div className="bg-[#0f0f0f] border border-white/5 rounded-[40px] p-10 shadow-[0_40px_80px_-20px_rgba(0,0,0,1)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[60px] rounded-full -mr-16 -mt-16 pointer-events-none"></div>

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest px-1">E-mail de Acesso</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@email.com"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm font-bold outline-none focus:border-emerald-500/50 transition-all placeholder:text-gray-700 shadow-inner"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest px-1">Senha</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm font-bold outline-none focus:border-emerald-500/50 transition-all placeholder:text-gray-700 shadow-inner"
              />
            </div>

            <div className="flex items-center gap-3 px-1">
              <label className="flex items-center cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={remember} 
                  onChange={(e) => setRemember(e.target.checked)}
                  className="hidden" 
                />
                <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${remember ? 'bg-emerald-600 border-emerald-400' : 'bg-white/5 border-white/10'}`}>
                  {remember && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg>}
                </div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest ml-3 group-hover:text-gray-300">Manter conectado (7 dias)</span>
              </label>
            </div>

            {error && (
              <div className="text-red-500 text-[10px] font-black uppercase tracking-widest text-center">
                {error}
              </div>
            )}

            <button 
              type="submit"
              className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 border border-emerald-400 rounded-2xl text-xs font-black uppercase tracking-[0.2em] text-white transition-all shadow-[0_10px_30px_rgba(16,185,129,0.3)] active:scale-95"
            >
              Entrar no Laboratório
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
