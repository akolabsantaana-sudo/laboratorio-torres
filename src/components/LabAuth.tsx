import React, { useState, useEffect } from "react";
import { KeyRound, ArrowRight, Loader2, Info, Lock, Mail, Users, CheckCircle } from "lucide-react";
import { deriveAuthHash } from "../utils/crypto";

interface LabAuthProps {
  onLoginSuccess: (labId: string, passcode: string, user: { email: string; name: string; role: "general" | "ceo" | "gerente" }) => void;
  onEnterDemoMode: () => void;
}

export default function LabAuth({ onLoginSuccess, onEnterDemoMode }: LabAuthProps) {
  const [emailInput, setEmailInput] = useState("dricardo.torres23@gmail.com");
  const [passwordInput, setPasswordInput] = useState("labtorress12345");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  // Advanced sync configuration drawer
  const [showAdvancedSync, setShowAdvancedSync] = useState(false);
  const [labIdInput, setLabIdInput] = useState("labtorres");
  const [passcodeInput, setPasscodeInput] = useState("labtorress12345");

  // Pre-seed default user registry in localStorage
  useEffect(() => {
    const defaultUsers = [
      { email: "dricardo.torres23@gmail.com", password: "labtorress12345", name: "Dr. Ricardo Torres", role: "general" },
      { email: "akolabsantaana@gmail.com", password: "AKO1234", name: "Administrador General", role: "general" }
    ];
    localStorage.setItem("labsync_users_v1", JSON.stringify(defaultUsers));
  }, []);

  const handleQuickLogin = (email: string, pass: string) => {
    setEmailInput(email);
    setPasswordInput(pass);
    setErrorMessage("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!emailInput.trim() || !passwordInput.trim()) {
      setErrorMessage("Por favor, ingrese su correo electrónico y contraseña.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Retrieve the users database
      const usersList = [
        { email: "dricardo.torres23@gmail.com", password: "labtorress12345", name: "Dr. Ricardo Torres", role: "general" },
        { email: "akolabsantaana@gmail.com", password: "AKO1234", name: "Administrador General", role: "general" }
      ];

      // 2. Validate user credentials (tolerant to case mismatches and trailing/leading spaces from copy-paste)
      const matchedUser = usersList.find((u: any) => {
        const checkEmailInput = emailInput.trim().toLowerCase();
        const checkPassInput = passwordInput.trim();
        const emailMatches = u.email.trim().toLowerCase() === checkEmailInput;
        const passMatches = u.password === checkPassInput || u.password.toLowerCase() === checkPassInput.toLowerCase();
        return emailMatches && passMatches;
      });

      if (!matchedUser) {
        throw new Error("Credenciales inválidas. Verifique su correo electrónico y su contraseña.");
      }

      // 3. Complete login sequence with local cryptographic key derivation
      // We automatically use 'labtorres' or the designated advanced sync credentials
      const activeLabId = labIdInput.trim().toLowerCase() || "labtorres";
      // Ensure activePasscode matches the canonical registered password to prevent any casing discrepancies in E2E keys across devices
      const activePasscode = showAdvancedSync 
        ? (passcodeInput.trim() || "labtorress12345") 
        : (matchedUser.password || passwordInput.trim());

      setSuccessMessage(`¡Acreditación exitosa! Bienvenido ${matchedUser.name}...`);
      
      setTimeout(() => {
        onLoginSuccess(activeLabId, activePasscode, {
          email: matchedUser.email,
          name: matchedUser.name,
          role: matchedUser.role as "general" | "ceo" | "gerente"
        });
      }, 1200);

    } catch (err: any) {
      setErrorMessage(err.message || "Fallo al iniciar sesión.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row shadow-2xl relative overflow-hidden font-sans" id="lab-auth-root">
      
      {/* LEFT COLUMN: Editorial branding banner with custom responsive SVG illustration */}
      <div className="lg:w-1/2 bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col justify-center items-center p-8 sm:p-12 relative overflow-hidden">
        {/* Decorative ambient gradients */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/3 w-[500px] h-32 bg-orange-500/5 rotate-45 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-md w-full text-center space-y-6">
          
          {/* Custom Stylized Logo depicting Flask, DNA, Blood Drop, and heartbeats */}
          <div className="flex flex-col items-center justify-center mb-2" id="ako-logo-wrapper">
            <svg className="w-48 h-48 drop-shadow-[0_10px_20px_rgba(124,58,237,0.25)] hover:scale-105 transition-transform duration-500" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Radial gradient background aura */}
              <circle cx="250" cy="230" r="140" fill="url(#bgGlow)" opacity="0.25" />

              <defs>
                <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                </radialGradient>
                
                <linearGradient id="orbitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7c3aed" /> {/* Deep Violet */}
                  <stop offset="30%" stopColor="#2563eb" /> {/* Cerulean Blue */}
                  <stop offset="55%" stopColor="#06b6d4" /> {/* Cyan */}
                  <stop offset="80%" stopColor="#f59e0b" /> {/* Golden yellow */}
                  <stop offset="100%" stopColor="#dc2626" /> {/* Blood red */}
                </linearGradient>

                <linearGradient id="flaskGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#c084fc" />
                  <stop offset="50%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#5b21b6" />
                </linearGradient>

                <linearGradient id="adnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>

                <linearGradient id="bloodGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f87171" />
                  <stop offset="100%" stopColor="#b91c1c" />
                </linearGradient>
              </defs>

              {/* Sweeping orbits forming a cradle around the flask */}
              <path d="M 120,280 C 100,180, 200,90, 310,120 C 400,145, 430,220, 380,310 C 320,410, 150,400, 100,310" 
                    stroke="url(#orbitGrad)" strokeWidth="15" strokeLinecap="round" fill="none" opacity="0.95" />
              
              <path d="M 150,330 C 110,240, 210,130, 330,160 C 410,185, 410,280, 340,340 C 270,400, 180,390, 150,330" 
                    stroke="url(#orbitGrad)" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.4" />

              {/* DNA Helix Coiled details behind flask */}
              <path d="M 215,310 Q 250,340 285,310 T 215,250 T 285,190" stroke="url(#adnGrad)" strokeWidth="6.5" fill="none" strokeLinecap="round" opacity="0.6" />

              {/* Glass Flask Structure representing scientific precision */}
              <path d="M 233,150 L 233,95 M 267,150 L 267,95 M 215,95 L 285,95" stroke="#ffffff" strokeWidth="11" strokeLinecap="round" opacity="0.95" />
              <path d="M 230,150 L 175,310 C 160,355, 195,375, 250,375 C 305,375, 340,355, 325,310 L 270,150" stroke="#ffffff" strokeWidth="11" strokeLinejoin="miter" fill="none" opacity="0.95" />

              {/* Liquid inside the flask with bubbles */}
              <path d="M 233,165 L 182,308 C 172,338, 202,365, 250,365 C 298,365, 328,338, 318,308 L 267,165 Z" fill="url(#flaskGrad)" />
              
              {/* Highlight / light reflections */}
              <path d="M 197,305 C 190,323, 215,355, 250,355" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" opacity="0.45" fill="none" />
              
              {/* Floating bubbles inside violet liquid */}
              <circle cx="230" cy="270" r="11" fill="#ffffff" opacity="0.3" />
              <circle cx="265" cy="235" r="7" fill="#ffffff" opacity="0.35" />
              <circle cx="245" cy="315" r="15" fill="#ffffff" opacity="0.25" />
              <circle cx="212" cy="330" r="6" fill="#ffffff" opacity="0.3" />
              <circle cx="282" cy="290" r="8" fill="#ffffff" opacity="0.25" />

              {/* Beautiful DNA Helix overlapping on front */}
              <path d="M 285,310 Q 250,280 215,310 T 285,370" stroke="url(#adnGrad)" strokeWidth="7" fill="none" strokeLinecap="round" />
              <line x1="233" y1="288" x2="267" y2="288" stroke="#ffffff" strokeWidth="3" opacity="0.75" />
              <line x1="222" y1="322" x2="278" y2="322" stroke="#ffffff" strokeWidth="3" opacity="0.75" />
              <line x1="238" y1="350" x2="262" y2="350" stroke="#ffffff" strokeWidth="3" opacity="0.75" />

              {/* Heartbeat EKG line in golden amber representing vitality */}
              <path d="M 115,230 L 135,230 L 143,205 L 153,255 L 160,215 L 167,235 L 190,235" 
                    stroke="#f59e0b" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />

              {/* Glowing Red Blood Drop structure at the top right of flask representing clinical pathology */}
              <path d="M 295,160 C 295,160, 325,200, 325,220 C 325,232, 312,242, 295,242 C 278,242, 265,232, 265,220 C 265,200, 295,160, 295,160 Z" 
                    fill="url(#bloodGrad)" stroke="#ffffff" strokeWidth="3.5" />
              <path d="M 285,210 C 285,200, 292,185, 292,185" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.75" fill="none" />
            </svg>
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tight text-white font-sans sm:text-5xl uppercase bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-sky-400 to-indigo-500">
              LABORATORIO
            </h1>
            <p className="text-xl font-black tracking-widest text-slate-100 uppercase font-sans">
              TORRES
            </p>
            <div className="h-1.5 w-24 bg-gradient-to-r from-blue-500 via-sky-500 to-indigo-500 mx-auto rounded-full mt-3" />
          </div>

          <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
            Sistema Integrado de Recepción de Pacientes, Emisión de Informes con Cifrado de Datos Punto-a-Punto, y Dashboard Inteligente de Caja y Estadísticas.
          </p>
        </div>
      </div>

      {/* RIGHT COLUMN: Stunning login form with Role test guides */}
      <div className="lg:w-1/2 flex flex-col justify-center py-12 px-6 sm:px-12 lg:px-16 bg-slate-950 relative z-20">
        
        <div className="max-w-md w-full mx-auto space-y-8">
          <div>
            <h2 className="text-2xl font-extrabold text-white font-sans tracking-tight">
              Ingreso de Personal Autorizado
            </h2>
            <p className="mt-1.5 text-sm text-slate-400">
              Digite su correo de colaborador asignado por el laboratorio.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit} id="ako-auth-form">
            <div>
              <label htmlFor="auth-email" className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Correo Electrónico
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4.5 w-4.5 text-slate-500" />
                </div>
                <input
                  id="auth-email"
                  type="email"
                  required
                  placeholder="ej. admin@akolab.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Contraseña de Seguridad
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-4.5 w-4.5 text-slate-500" />
                </div>
                <input
                  id="auth-password"
                  type="password"
                  required
                  placeholder="Ingrese su contraseña"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all text-sm"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-3.5 text-xs text-red-400 flex items-start gap-2.5" id="auth-error-msg">
                <Info className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3.5 text-xs text-emerald-400 flex items-start gap-2.5">
                <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-lg shadow-violet-950/20 text-sm font-bold text-white bg-gradient-to-r from-violet-600 via-blue-600 to-orange-500 hover:opacity-90 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all cursor-pointer disabled:opacity-50"
                id="submit-auth-btn"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                ) : (
                  <>
                    Iniciar Sesión
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>



          {/* ADVANCED CLOUD CONFIGURATION TRIGGERS */}
          <div className="border-t border-slate-900 pt-5 text-center">
            <button
              type="button"
              onClick={() => setShowAdvancedSync(!showAdvancedSync)}
              className="text-xs text-slate-500 hover:text-slate-350 underline cursor-pointer"
            >
              {showAdvancedSync ? "Ocultar Sincronización Avanzada" : "Sincronización Avanzada (Lab ID / Claves)"}
            </button>

            {showAdvancedSync && (
              <div className="mt-4 p-4 border border-dashed border-slate-800 bg-slate-900/20 rounded-2xl text-left space-y-3.5 animate-fadeIn">
                <div className="flex gap-2 text-xs text-slate-400">
                  <Lock className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                  <p>
                    Edite los datos de abajo si desea que las cuentas accedan a un servidor centralizado específico.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Lab ID (Sinc.)</label>
                    <input
                      type="text"
                      value={labIdInput}
                      onChange={(e) => setLabIdInput(e.target.value)}
                      className="mt-1 block w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white uppercase font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Contraseña Cifrado</label>
                    <input
                      type="password"
                      value={passcodeInput}
                      onChange={(e) => setPasscodeInput(e.target.value)}
                      className="mt-1 block w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
