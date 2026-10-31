import React, { useState, useRef, useEffect } from "react";
import {
  Recycle,
  ShieldCheck,
  Wallet,
  QrCode,
  MapPin,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock,
  Mail,
  User,
  Phone,
  Eye,
  EyeOff,
  ShoppingBag,
  Store,
  Factory,
  AlertCircle,
  Leaf,
  Check,
  Building2,
} from "lucide-react";
import confetti from "canvas-confetti";
import { useAuth } from "../context/AuthContext";

export default function AuthPortal({ onAuthenticated, initialMode = "signup" }) {
  const { login, signup, demoLogin } = useAuth();
  const [mode, setMode] = useState(initialMode); // "signup" is default as requested
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("consumer");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const nameInputRef = useRef(null);
  const emailInputRef = useRef(null);

  useEffect(() => {
    if (mode === "signup" && nameInputRef.current) {
      nameInputRef.current.focus();
    } else if (mode === "login" && emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, [mode]);

  const fireCelebration = () => {
    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#10b981", "#059669", "#34d399", "#064e3b", "#a7f3d0"],
      });
    } catch (_) {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        if (!name.trim()) {
          setError("Please enter your full name.");
          setLoading(false);
          return;
        }
        if (!email.trim() || !password.trim()) {
          setError("Please fill in both email and password.");
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError("Password should be at least 6 characters.");
          setLoading(false);
          return;
        }
        if (!agreeTerms) {
          setError("Please accept the DRS recycling terms to proceed.");
          setLoading(false);
          return;
        }

        const res = signup(name.trim(), email.trim(), password, phone.trim(), selectedRole);
        if (!res.success) {
          setError(res.error || "Failed to create account.");
          setLoading(false);
          return;
        }

        fireCelebration();
        setSuccessData({ name: name.trim(), role: selectedRole });
        setTimeout(() => {
          if (onAuthenticated) onAuthenticated(selectedRole);
        }, 750);
      } else {
        // Login mode
        if (!email.trim() || !password.trim()) {
          setError("Please enter your email and password.");
          setLoading(false);
          return;
        }

        const res = login(email.trim(), password);
        if (!res.success) {
          setError(res.error || "Invalid credentials.");
          setLoading(false);
          return;
        }

        fireCelebration();
        setSuccessData({ name: res.user?.name || "User", role: res.user?.role || "consumer" });
        setTimeout(() => {
          if (onAuthenticated) onAuthenticated(res.user?.role || "consumer");
        }, 650);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleQuickDemo = (role = "consumer") => {
    setError("");
    const res = demoLogin(role);
    fireCelebration();
    setSuccessData({
      name: res.user?.name || "Aarav Sharma",
      role: role,
    });
    setTimeout(() => {
      if (onAuthenticated) onAuthenticated(role);
    }, 550);
  };

  const handleFillDemoCreds = () => {
    setEmail("aarav.sharma@example.in");
    setPassword("password123");
    setError("");
  };

  const roles = [
    {
      id: "consumer",
      title: "Citizen / Recycler",
      desc: "Scan barcodes, return empties & claim deposit refunds to UPI",
      icon: ShoppingBag,
      tag: "Consumer",
    },
    {
      id: "agent",
      title: "Collection Agent",
      desc: "Kirana store / DWCC intake agent verifying returns & payouts",
      icon: Store,
      tag: "Agent",
    },
    {
      id: "admin",
      title: "Producer / EPR Admin",
      desc: "Brand compliance, ESG auditing & municipal circularity analytics",
      icon: Factory,
      tag: "Admin",
    },
  ];

  return (
    <div className="relative min-h-screen bg-[#f4f7f5] text-[#17231d] flex flex-col justify-between overflow-x-hidden">
      {/* Background Decorative Mesh */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-emerald-200/40 blur-[130px]" />
        <div className="absolute top-1/2 -left-48 h-[550px] w-[550px] rounded-full bg-teal-100/50 blur-[140px]" />
        <div className="absolute -bottom-40 right-1/4 h-[500px] w-[500px] rounded-full bg-emerald-100/60 blur-[120px]" />
        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(#064e3b 1px, transparent 1px)`,
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      {/* Top Branding Navigation */}
      <header className="relative z-10 w-full border-b border-[#e1eae4] bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#173d2b] to-[#0c2419] text-white shadow-md shadow-emerald-950/15">
              <Recycle size={22} className="animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-extrabold tracking-tight text-slate-950">
                  Bharath<span className="text-emerald-800">Loop</span>
                </span>
                <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-900 border border-emerald-300/60">
                  DRS 2.0
                </span>
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#607469]">
                Deposit-Return Intelligence &middot; Bengaluru Pilot
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50/80 px-3 py-1 text-xs font-semibold text-emerald-900">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              BBMP DWCC &amp; CPCB Aligned
            </span>

            <button
              onClick={() => handleQuickDemo("consumer")}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-600/30 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-900 hover:bg-emerald-100 hover:border-emerald-600/50 transition-all active:scale-95 shadow-2xs"
            >
              <Sparkles size={13} className="text-emerald-700" />
              <span>Instant Demo</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Authentication Section */}
      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:py-12">
        <div className="grid w-full grid-cols-1 items-stretch gap-8 lg:grid-cols-12 lg:gap-10">
          
          {/* Left Column: Visual Showcase & DRS Value Props (5 cols) */}
          <div className="hidden lg:flex lg:col-span-5 flex-col justify-between rounded-[32px] bg-gradient-to-br from-[#0c2e1f] via-[#123d29] to-[#071d13] p-8 text-white shadow-[0_24px_60px_rgba(7,29,19,0.28)] border border-emerald-800/40 relative overflow-hidden">
            {/* Ambient glows inside card */}
            <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-emerald-400/10 blur-[80px]" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-teal-400/10 blur-[90px]" />

            {/* Top Showcase Content */}
            <div className="relative space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                <Leaf size={12} className="text-emerald-400" />
                Urban Circular Economy Pilot
              </div>

              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl leading-[1.18]">
                  India&apos;s Sovereign <br />
                  <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-100 bg-clip-text text-transparent">
                    Deposit-Return System
                  </span>
                </h1>
                <p className="mt-3 text-sm text-emerald-100/80 leading-relaxed font-normal">
                  Turn verified beverage containers into instant digital currency. Return empties at any BBMP Dry Waste Collection Centre or partner retailer across Bengaluru.
                </p>
              </div>

              {/* 3 Core Pillars */}
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3 rounded-2xl bg-white/[0.06] p-3.5 border border-white/10 backdrop-blur-sm transition-all hover:bg-white/[0.09]">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    <Wallet size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Guaranteed Deposit Refunds</div>
                    <div className="text-[11px] text-emerald-200/70 mt-0.5 leading-snug">
                      Claim ₹5.00 – ₹15.00 per item instantly to your UPI or bank wallet upon return verification.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-white/[0.06] p-3.5 border border-white/10 backdrop-blur-sm transition-all hover:bg-white/[0.09]">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    <QrCode size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Anti-Fraud Dynamic QR</div>
                    <div className="text-[11px] text-emerald-200/70 mt-0.5 leading-snug">
                      Time-expiring single-use return tokens prevent duplicate redemption and grey-market leakage.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-white/[0.06] p-3.5 border border-white/10 backdrop-blur-sm transition-all hover:bg-white/[0.09]">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">48+ BBMP Urban DWCC Hubs</div>
                    <div className="text-[11px] text-emerald-200/70 mt-0.5 leading-snug">
                      Geo-anchored collection centres across Indiranagar, Koramangala, Whitefield &amp; HSR Layout.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Metrics Bar */}
            <div className="relative mt-8 rounded-2xl bg-black/25 p-4 border border-white/10">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/80 mb-2.5">
                Pilot Live Performance (Karnataka)
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-black text-white font-mono">4,820+</div>
                  <div className="text-[10px] text-emerald-200/70">Units Recycled</div>
                </div>
                <div className="border-x border-white/10">
                  <div className="text-lg font-black text-emerald-300 font-mono">₹38,560</div>
                  <div className="text-[10px] text-emerald-200/70">Refunds Paid</div>
                </div>
                <div>
                  <div className="text-lg font-black text-teal-300 font-mono">99.4%</div>
                  <div className="text-[10px] text-emerald-200/70">Flake Purity</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Auth Form (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <div className="relative overflow-hidden rounded-[32px] bg-white p-6 sm:p-9 shadow-[0_20px_50px_rgba(23,61,43,0.08)] border border-[#dfe9e2]">
              
              {/* Success Transition Overlay */}
              {successData && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/95 backdrop-blur-md p-6 text-center animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex h-18 w-18 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-700 shadow-lg shadow-emerald-700/15 mb-4 animate-bounce">
                    <CheckCircle2 size={38} />
                  </div>
                  <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    {mode === "signup" ? "Account Activated!" : "Welcome Back!"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600 max-w-sm">
                    Authenticated as <strong className="text-emerald-900 font-semibold">{successData.name}</strong>. Entering BharathLoop DRS workspace...
                  </p>
                  <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>Synchronizing wallet &amp; collection network...</span>
                  </div>
                </div>
              )}

              {/* Form Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                    {mode === "signup" ? "Create your account" : "Sign in to BharathLoop"}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {mode === "signup"
                      ? "Join the Bengaluru deposit-return pilot to scan and redeem"
                      : "Access your recycling dashboard, wallet balance and claims"}
                  </p>
                </div>

                {/* Mode Toggle Switcher */}
                <div className="inline-flex self-start sm:self-auto rounded-2xl bg-[#edf3ef] p-1 border border-[#d6e4db]">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setError("");
                    }}
                    className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                      mode === "signup"
                        ? "bg-[#173d2b] text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Sign Up
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setError("");
                    }}
                    className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                      mode === "login"
                        ? "bg-[#173d2b] text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Sign In
                  </button>
                </div>
              </div>

              {/* Fast 1-Click Demo Evaluation Banner */}
              <div className="mb-6 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/70 p-3.5 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                    <Sparkles size={15} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-950">
                      Evaluating BharathLoop?
                    </div>
                    <div className="text-[11px] text-emerald-800">
                      Skip manual form entry with pre-loaded demo credentials
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleQuickDemo("consumer")}
                    className="rounded-xl bg-[#173d2b] hover:bg-[#204e38] text-white px-3 py-1.5 text-xs font-bold transition shadow-xs active:scale-95 flex items-center gap-1"
                  >
                    <span>Citizen Demo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemo("agent")}
                    className="rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 px-3 py-1.5 text-xs font-bold transition shadow-2xs active:scale-95"
                    title="Collection Agent View"
                  >
                    Agent
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemo("admin")}
                    className="rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 px-3 py-1.5 text-xs font-bold transition shadow-2xs active:scale-95"
                    title="Producer / Admin View"
                  >
                    Admin
                  </button>
                </div>
              </div>

              {/* Error Alert Box */}
              {error && (
                <div className="mb-5 flex items-start gap-2.5 rounded-2xl bg-red-50 border border-red-200 p-3.5 text-xs font-medium text-red-900 animate-in fade-in duration-150">
                  <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span>{error}</span>
                    {mode === "login" && (
                      <button
                        type="button"
                        onClick={handleFillDemoCreds}
                        className="ml-2 underline text-red-800 font-bold hover:text-red-950"
                      >
                        Auto-fill demo credentials
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Form Component */}
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Sign Up: Role Selection Cards */}
                {mode === "signup" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      Choose Your Primary Role in the DRS Network
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {roles.map((r) => {
                        const Icon = r.icon;
                        const isSelected = selectedRole === r.id;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setSelectedRole(r.id)}
                            className={`flex flex-col text-left p-3 rounded-2xl border transition-all ${
                              isSelected
                                ? "border-emerald-700 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-700/40"
                                : "border-slate-200 bg-slate-50/60 hover:bg-slate-100/60 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full mb-1">
                              <div
                                className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                                  isSelected
                                    ? "bg-[#173d2b] text-white"
                                    : "bg-white text-slate-600 border border-slate-200"
                                }`}
                              >
                                <Icon size={14} />
                              </div>
                              {isSelected && (
                                <div className="h-4 w-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                                  <Check size={10} strokeWidth={3} />
                                </div>
                              )}
                            </div>
                            <span className="text-xs font-bold text-slate-900">{r.title}</span>
                            <span className="text-[10px] text-slate-500 mt-0.5 line-clamp-2 leading-tight">
                              {r.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sign Up Fields: Full Name & Phone */}
                {mode === "signup" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                          <User size={15} />
                        </div>
                        <input
                          ref={nameInputRef}
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Aarav Sharma"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-600 transition"
                        />
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Mobile Number <span className="text-slate-400 font-normal">(for UPI refunds)</span>
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                          <Phone size={15} />
                        </div>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 98450 12345"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-600 transition"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Mail size={15} />
                    </div>
                    <input
                      ref={emailInputRef}
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={mode === "signup" ? "you@example.com" : "aarav.sharma@example.in"}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-600 transition"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Password <span className="text-red-500">*</span>
                    </label>
                    {mode === "login" && (
                      <button
                        type="button"
                        onClick={handleFillDemoCreds}
                        className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 transition"
                      >
                        Use Demo Password
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Lock size={15} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === "signup" ? "Create a strong password (6+ chars)" : "Enter your password"}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-10 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-600 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-700 transition"
                      tabIndex={-1}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Checkbox row */}
                <div className="flex items-center justify-between pt-1">
                  {mode === "signup" ? (
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                      />
                      <span className="text-[11px] text-slate-600">
                        I agree to the <strong className="text-slate-800 font-semibold">DRS Deposit Guidelines</strong> &amp; BBMP Recycling Charter
                      </span>
                    </label>
                  ) : (
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                      />
                      <span className="text-[11px] text-slate-600">
                        Remember this device for 30 days
                      </span>
                    </label>
                  )}
                </div>

                {/* Main Submit Button */}
                <button
                  type="submit"
                  disabled={loading || !!successData}
                  className="w-full mt-2 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#173d2b] to-[#0d2a1c] py-3.5 px-4 text-xs font-extrabold text-white shadow-lg shadow-emerald-950/20 hover:from-[#1e4d36] hover:to-[#133a28] transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>{mode === "signup" ? "Creating Account..." : "Verifying Credentials..."}</span>
                    </span>
                  ) : (
                    <>
                      <span>{mode === "signup" ? "Create Account & Enter BharathLoop" : "Sign In to Your Account"}</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>

              {/* Mode Switch Helper Footer */}
              <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <div>
                  {mode === "signup" ? (
                    <span>
                      Already have a verified account?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setMode("login");
                          setError("");
                        }}
                        className="font-bold text-emerald-800 hover:text-emerald-950 transition underline"
                      >
                        Sign In here
                      </button>
                    </span>
                  ) : (
                    <span>
                      New to BharathLoop DRS?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setMode("signup");
                          setError("");
                        }}
                        className="font-bold text-emerald-800 hover:text-emerald-950 transition underline"
                      >
                        Create an account
                      </button>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <ShieldCheck size={14} className="text-emerald-700" />
                  <span>256-Bit Encrypted &middot; Zero Tracking</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Clean Bottom Regulatory Footer */}
      <footer className="relative z-10 w-full border-t border-[#e2eae4] bg-white/60 py-4 backdrop-blur-xs">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-2 px-4 text-center sm:text-left text-[11px] text-slate-500 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">BharathLoop DRS Pilot</span>
            <span>&middot;</span>
            <span>Bruhat Bengaluru Mahanagara Palike (BBMP) SWM Framework</span>
          </div>
          <div className="text-slate-400">
            Karnataka State Pollution Control Board &middot; CPCB Plastic Waste EPR Category I &amp; II
          </div>
        </div>
      </footer>
    </div>
  );
}
