import React, { useState, useRef, useEffect } from "react";
import {
  X, Mail, Lock, User, Eye, EyeOff, ArrowRight, Recycle,
  Play, Phone, CheckCircle2, Shield, Leaf, Wallet,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function AuthModal({ onClose, initialMode = "login" }) {
  const { login, signup, demoLogin } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const emailRef = useRef(null);
  const nameRef = useRef(null);

  useEffect(() => {
    if (mode === "signup" && nameRef.current) nameRef.current.focus();
    else if (mode === "login" && emailRef.current) emailRef.current.focus();
  }, [mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        if (!name.trim()) { setError("Please enter your name."); setLoading(false); return; }
        if (!email.trim() || !password.trim()) { setError("Please fill in all required fields."); setLoading(false); return; }
        if (password.length < 6) { setError("Password must be at least 6 characters."); setLoading(false); return; }
        const result = signup(name.trim(), email.trim(), password, phone.trim());
        if (!result.success) { setError(result.error); setLoading(false); return; }
      } else {
        if (!email.trim() || !password.trim()) { setError("Please enter your email and password."); setLoading(false); return; }
        const result = login(email.trim(), password);
        if (!result.success) { setError(result.error); setLoading(false); return; }
      }
      setSuccess(true);
      setTimeout(() => onClose(), 600);
    } catch (_) {
      setError("An unexpected authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = () => {
    demoLogin();
    setSuccess(true);
    setTimeout(() => onClose(), 500);
  };

  const switchMode = (m) => {
    setMode(m);
    setError("");
    setSuccess(false);
  };

  const benefits = [
    { icon: Wallet, text: "Earn deposit refunds on every return" },
    { icon: Shield, text: "Anti-fraud verified QR return tokens" },
    { icon: Leaf, text: "Track your environmental impact" },
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ animation: "fadeIn 0.2s ease-out" }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#273E47]/70 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal Panel */}
      <div
        className="relative w-full max-w-[460px] overflow-hidden rounded-[28px] bg-white shadow-[0_32px_80px_rgba(39,62,71,0.25)] border border-[#E5DEC9]"
        style={{ animation: "scaleIn 0.25s ease-out" }}
      >
        {/* Success Overlay */}
        {success && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm rounded-[28px]">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#D8C99B]/30 text-[#BD632F] mb-3">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-lg font-bold text-[#273E47]">
              {mode === "login" ? "Welcome back!" : "Account created!"}
            </h3>
            <p className="text-sm text-[#355070] mt-1">Redirecting to dashboard...</p>
          </div>
        )}

        {/* Top Gradient Header */}
        <div className="relative overflow-hidden bg-[#273E47] border-b border-[#355070]/60 px-7 pt-7 pb-6">
          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#355070] border border-[#355070]/80 text-[#D8973C] shadow-sm">
                <Recycle size={24} />
              </div>
              <div>
                <h2 className="text-[17px] font-bold text-white tracking-tight leading-snug">
                  {mode === "login" ? "Welcome Back" : "Join BharathLoop"}
                </h2>
                <p className="text-[12px] text-[#D8C99B] mt-0.5 leading-relaxed">
                  {mode === "login"
                    ? "Access your deposit balance & claim cashbacks"
                    : "Start earning rewards for responsible recycling"}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl bg-[#355070] p-2 text-[#D8C99B] hover:bg-[#1e3037] hover:text-white transition-all cursor-pointer"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Benefits row */}
          <div className="relative mt-5 flex gap-3">
            {benefits.map((b, i) => {
              const Icon = b.icon;
              return (
                <div
                  key={i}
                  className="flex items-center gap-1.5 rounded-lg bg-[#1e3037]/70 px-2.5 py-1.5 border border-[#355070]/50"
                >
                  <Icon size={12} className="text-[#D8973C] shrink-0" />
                  <span className="text-[10px] text-[#E0D7C6] leading-tight">{b.text}</span>
                </div>
              );
            })}
          </div>

          {/* Demo Login CTA */}
          <div className="relative mt-4 flex items-center justify-between gap-3 rounded-xl bg-[#1e3037] border border-[#355070]/60 px-3.5 py-2.5">
            <div className="flex items-center gap-2 text-[11px] text-[#E0D7C6]">
              <Play size={11} className="text-[#D8973C] fill-[#D8973C]" />
              <span>Quick evaluation? Try a pre-configured account</span>
            </div>
            <button
              type="button"
              onClick={handleDemoSignIn}
              className="shrink-0 rounded-lg bg-[#BD632F] hover:bg-[#a85527] px-3 py-1.5 text-[11px] font-bold text-white transition-all cursor-pointer shadow-sm"
            >
              Demo Login
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="relative grid grid-cols-2 bg-[#FAF8F5] border-b border-[#E5DEC9]">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`relative py-3.5 text-[13px] font-bold transition-all text-center cursor-pointer ${
              mode === "login"
                ? "text-[#273E47] bg-white"
                : "text-[#355070] hover:text-[#273E47]"
            }`}
          >
            Sign In
            {mode === "login" && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2.5px] w-12 rounded-full bg-[#BD632F]" />
            )}
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`relative py-3.5 text-[13px] font-bold transition-all text-center cursor-pointer ${
              mode === "signup"
                ? "text-[#273E47] bg-white"
                : "text-[#355070] hover:text-[#273E47]"
            }`}
          >
            Create Account
            {mode === "signup" && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2.5px] w-12 rounded-full bg-[#BD632F]" />
            )}
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-7 py-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl bg-red-50 border border-red-200/80 px-4 py-3 text-[12px] font-medium text-red-800">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 shrink-0">
                <X size={11} className="text-red-600" />
              </div>
              <span>{error}</span>
            </div>
          )}

          {mode === "signup" && (
            <>
              {/* Full Name */}
              <div>
                <label className="block text-[12px] font-semibold text-[#273E47] mb-1.5">Full Name</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#355070]">
                    <User size={16} />
                  </div>
                  <input
                    ref={nameRef}
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF8F5] py-3 pl-10 pr-4 text-[13px] text-[#273E47] placeholder:text-[#355070]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BD632F]/20 focus:border-[#BD632F] transition-all"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-[12px] font-semibold text-[#273E47] mb-1.5">
                  Phone Number <span className="text-[#355070]/80 font-normal">(Optional, for UPI)</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#355070]">
                    <Phone size={16} />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF8F5] py-3 pl-10 pr-4 text-[13px] text-[#273E47] placeholder:text-[#355070]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BD632F]/20 focus:border-[#BD632F] transition-all"
                  />
                </div>
              </div>
            </>
          )}

          {/* Email */}
          <div>
            <label className="block text-[12px] font-semibold text-[#273E47] mb-1.5">Email Address</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#355070]">
                <Mail size={16} />
              </div>
              <input
                ref={emailRef}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF8F5] py-3 pl-10 pr-4 text-[13px] text-[#273E47] placeholder:text-[#355070]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BD632F]/20 focus:border-[#BD632F] transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-[12px] font-semibold text-[#273E47] mb-1.5">Password</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#355070]">
                <Lock size={16} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "At least 6 characters" : "Enter your password"}
                className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF8F5] py-3 pl-10 pr-11 text-[13px] text-[#273E47] placeholder:text-[#355070]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BD632F]/20 focus:border-[#BD632F] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#355070] hover:text-[#273E47] transition cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || success}
            className="w-full mt-1 flex items-center justify-center gap-2.5 rounded-xl bg-[#BD632F] hover:bg-[#a85527] py-3.5 text-[13px] font-bold text-white shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Processing...
              </span>
            ) : (
              <>
                <span>{mode === "login" ? "Sign In" : "Create Account"}</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* Bottom Security Note */}
        <div className="px-7 py-3.5 bg-[#FAF8F5] border-t border-[#E5DEC9] flex items-center justify-center gap-2 text-[11px] text-[#355070]">
          <Shield size={12} className="text-[#BD632F]" />
          <span>Encrypted local storage &middot; No third-party tracking</span>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
