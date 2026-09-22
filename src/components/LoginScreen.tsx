import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PredefinedPartner } from '../firebase/seed';
import { Flame, ShieldCheck, UserCheck, Lock, Mail, ArrowRight, Sparkles } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { predefinedPartners, signInPartnerQuick, signInCustomEmail, loading } = useAuth();
  const [selectedPartner, setSelectedPartner] = useState<PredefinedPartner | null>(null);
  const [customMode, setCustomMode] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handlePartnerClick = async (partner: PredefinedPartner) => {
    setSelectedPartner(partner);
    setError('');
    setIsSubmitting(true);
    try {
      await signInPartnerQuick(partner);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Login failed. Please check connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError('');
    setIsSubmitting(true);
    try {
      await signInCustomEmail(email, password);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-amber-500 selection:text-black">
      {/* Decorative background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-3 shadow-lg shadow-amber-500/5">
            <Flame className="w-8 h-8 text-amber-500 animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
            Diwali Patakas Ledger
            <Sparkles className="w-5 h-5 text-amber-400" />
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
            Tamper-Resistant Cash & Stock Tracking • 3 Partners
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm">
            {error}
          </div>
        )}

        {!customMode ? (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Select Your Partner Account
              </span>
              <span className="text-[11px] text-amber-400 font-medium">
                1-Tap Stall Sign In
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 mb-5">
              {predefinedPartners.map((partner) => {
                const isSelected = selectedPartner?.email === partner.email && isSubmitting;
                return (
                  <button
                    key={partner.email}
                    onClick={() => handlePartnerClick(partner)}
                    disabled={isSubmitting}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all duration-150 text-left active:scale-[0.99] ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500 text-white'
                        : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 hover:border-slate-600 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm ${partner.avatarBg}`}>
                        {partner.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-white">
                          {partner.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {partner.email}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                  </button>
                );
              })}
            </div>

            <div className="text-center pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCustomMode(true)}
                className="text-xs text-slate-400 hover:text-amber-400 underline underline-offset-4 transition-colors"
              >
                Sign in with custom email / password
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCustomSubmit} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl">
            <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              Sign In with Email & Password
            </h2>

            <div className="space-y-3.5 mb-5">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="partner@diwalipatakas.app"
                    className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 font-semibold text-slate-950 text-sm transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Authenticating...' : 'Sign In'}
            </button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setCustomMode(false)}
                className="text-xs text-slate-400 hover:text-amber-400 underline underline-offset-4"
              >
                Back to 4 Partners 1-Tap List
              </button>
            </div>
          </form>
        )}

        <div className="text-center mt-6 text-[11px] text-slate-500">
          Enforced by Firestore Security Rules & Real-time Audit Trail
        </div>
      </div>
    </div>
  );
};
