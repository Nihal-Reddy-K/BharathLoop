import React, { useState } from "react";
import {
  Recycle,
  ShoppingBag,
  Store,
  Factory,
  LogIn,
  LogOut,
  User,
  ChevronDown,
  Wallet,
  ExternalLink,
  ShieldCheck,
  Building2,
} from "lucide-react";

import { useAuth } from "./context/AuthContext";
import AuthModal from "./components/AuthModal";
import DemoGuideBar from "./components/DemoGuideBar";
import ConsumerView from "./components/ConsumerView";
import AgentView from "./components/AgentView";
import AdminView from "./components/AdminView";

const API_URL = "http://127.0.0.1:8000";

export default function App() {
  const { user, isAuthenticated, logout, walletBalance } = useAuth();
  const [role, setRole] = useState("consumer"); // "consumer" | "agent" | "admin"
  const [consumerSubTab, setConsumerSubTab] = useState("scan"); // "scan" | "packagings" | "wallet"
  const [agentInitialToken, setAgentInitialToken] = useState("");
  const [demoStep, setDemoStep] = useState(1);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState("login");
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Quick switch from Return QR Modal to Agent View
  const handleSwitchToAgentWithToken = (token) => {
    setAgentInitialToken(token);
    setRole("agent");
    setDemoStep(3);
  };

  // Step selector from DemoGuideBar
  const handleSelectDemoStep = (stepId) => {
    setDemoStep(stepId);
    if (stepId === 1) {
      setRole("consumer");
      setConsumerSubTab("scan");
    } else if (stepId === 2) {
      setRole("consumer");
      setConsumerSubTab("packagings");
    } else if (stepId === 3) {
      setRole("agent");
    } else if (stepId === 4) {
      setRole("consumer");
      setConsumerSubTab("wallet");
    } else if (stepId === 5) {
      setRole("agent");
    }
  };

  const handleResetDemo = () => {
    setRole("consumer");
    setConsumerSubTab("scan");
    setDemoStep(1);
    setAgentInitialToken("");
  };

  const openAuth = (mode) => {
    setAuthModalMode(mode);
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] text-[#17231d] font-sans antialiased selection:bg-emerald-200 selection:text-emerald-950">
      {/* 1. Interactive 3-Minute Guided Demo Tour Bar */}
      <DemoGuideBar
        currentStep={demoStep}
        onSelectStep={handleSelectDemoStep}
        onResetDemo={handleResetDemo}
      />

      {/* 2. Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-[#dfe9e2] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          {/* Brand Logo */}
          <button
            onClick={() => {
              setRole("consumer");
              setConsumerSubTab("scan");
            }}
            className="group flex items-center gap-3 text-left transition focus:outline-none"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#173d2b] to-[#0c2419] text-white shadow-[0_6px_20px_rgba(23,61,43,0.2)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-105">
              <Recycle size={22} className="transition-transform duration-500 group-hover:rotate-180" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-extrabold tracking-tight text-slate-950">
                  Bharath<span className="text-emerald-800">Loop</span>
                </span>
                <span className="rounded-md bg-emerald-100/80 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-900 border border-emerald-300/60">
                  DRS 2.0
                </span>
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6b7b72]">
                Deposit-Return Intelligence
              </div>
            </div>
          </button>

          {/* Role Mode Switcher */}
          <nav className="flex items-center rounded-2xl bg-[#ecf2ee] p-1 border border-[#d8e5dc]">
            <button
              onClick={() => {
                setRole("consumer");
                setDemoStep(1);
              }}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                role === "consumer"
                  ? "bg-[#173d2b] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ShoppingBag size={14} />
              <span className="hidden sm:inline">Consumer</span>
            </button>

            <button
              onClick={() => {
                setRole("agent");
                setDemoStep(3);
              }}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                role === "agent"
                  ? "bg-[#173d2b] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Store size={14} />
              <span className="hidden sm:inline">Collection Agent</span>
              <span className="sm:hidden">Agent</span>
            </button>

            <button
              onClick={() => {
                setRole("admin");
              }}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                role === "admin"
                  ? "bg-[#173d2b] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Factory size={14} />
              <span className="hidden sm:inline">Producer / Admin</span>
              <span className="sm:hidden">Admin</span>
            </button>
          </nav>

          {/* Auth / User Area */}
          <div className="flex items-center gap-3">
            {/* Pilot Badge */}
            <div className="hidden lg:flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-900 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Bengaluru Pilot</span>
            </div>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                {/* Live Wallet Pill */}
                <button
                  onClick={() => {
                    setRole("consumer");
                    setConsumerSubTab("wallet");
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-emerald-300/80 bg-emerald-50/90 px-3 py-1.5 text-xs font-bold text-emerald-900 hover:bg-emerald-100 transition shadow-xs"
                  title="View Wallet & Redeem"
                >
                  <Wallet size={14} className="text-emerald-700" />
                  <span>₹{Number(walletBalance || 0).toFixed(2)}</span>
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <span className="hidden sm:inline max-w-[110px] truncate">
                      {user?.name || "User"}
                    </span>
                    <ChevronDown size={14} className="text-slate-400" />
                  </button>

                  {showUserMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                      <div className="absolute right-0 top-full mt-2 z-50 w-60 rounded-2xl border border-slate-200 bg-white py-2 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                        <div className="px-4 py-2.5 border-b border-slate-100">
                          <div className="text-sm font-bold text-slate-900">{user?.name}</div>
                          <div className="text-xs text-slate-500 truncate">{user?.email}</div>
                          {user?.phone && (
                            <div className="text-[11px] text-slate-400 mt-0.5">{user.phone}</div>
                          )}
                        </div>
                        <div className="px-4 py-2 bg-emerald-50/60 border-b border-emerald-100/50 flex items-center justify-between text-xs">
                          <span className="text-emerald-800 font-semibold">Wallet Balance</span>
                          <span className="text-emerald-950 font-extrabold font-mono">
                            ₹{Number(walletBalance || 0).toFixed(2)}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            setRole("consumer");
                            setConsumerSubTab("wallet");
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition text-left"
                        >
                          <Wallet size={14} className="text-emerald-700" />
                          <span>Redeem Cashback / Vouchers</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            logout();
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-red-700 hover:bg-red-50 transition text-left"
                        >
                          <LogOut size={14} />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openAuth("login")}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
                >
                  <LogIn size={14} />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
                <button
                  onClick={() => openAuth("signup")}
                  className="flex items-center gap-1.5 rounded-xl bg-[#173d2b] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#204e38] transition shadow-sm"
                >
                  <span>Sign Up</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 3. Main Views Content */}
      <main className="pb-24">
        {role === "consumer" && (
          <ConsumerView
            apiUrl={API_URL}
            activeSubTab={consumerSubTab}
            setActiveSubTab={setConsumerSubTab}
            onSwitchToAgent={handleSwitchToAgentWithToken}
          />
        )}

        {role === "agent" && (
          <AgentView
            apiUrl={API_URL}
            initialToken={agentInitialToken}
            onSwitchToConsumer={() => {
              setRole("consumer");
              setConsumerSubTab("packagings");
            }}
          />
        )}

        {role === "admin" && <AdminView apiUrl={API_URL} />}
      </main>

      {/* 4. Footer & Regulatory / BBMP Data Sources */}
      <footer className="border-t border-[#dce7df] bg-white px-6 py-12">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Main Footer Brand Header */}
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center border-b border-slate-100 pb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#064e3b] text-white shadow-sm">
                <Recycle size={20} />
              </div>
              <div>
                <div className="text-base font-extrabold text-slate-900">
                  Bharath<span className="text-emerald-800">Loop</span> DRS Architecture
                </div>
                <div className="text-xs text-slate-500">
                  GTIN-anchored digital deposit-return system (DRS) tailored for Indian urban municipal ecosystems
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">
                <ShieldCheck size={14} className="text-emerald-700" />
                BBMP Pilot Verified &middot; Bengaluru, Karnataka
              </span>
            </div>
          </div>

          {/* Official Data Sources & Regulatory Provenance Section */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Building2 size={14} className="text-emerald-700" />
              <span>Official Datasets &amp; Verification Sources</span>
            </h4>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Source 1: BBMP SWM */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">BBMP SWM Network</span>
                  <a
                    href="https://site.bbmp.gov.in"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-800 hover:text-emerald-950"
                    title="Visit BBMP Portal"
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>
                <div className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Ward-level Dry Waste Collection Centres (DWCCs) operated under BBMP Solid Waste Management Bye-Laws with partners <em>Hasiru Dala</em>, <em>Saahas Zero Waste</em>, and <em>Swachha Eco</em>.
                </div>
                <div className="mt-2 text-[10px] font-semibold text-emerald-800 uppercase tracking-wide">
                  Intake Centers &amp; GPS Anchor
                </div>
              </div>

              {/* Source 2: CPCB / EPR */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">CPCB &amp; MoEFCC EPR</span>
                  <a
                    href="https://cpcb.nic.in"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-800 hover:text-emerald-950"
                    title="Visit CPCB Portal"
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>
                <div className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Plastic Waste Management Rules (PWM 2016, amended 2022). Packaging categories (Cat I Rigid, Cat II Flexible, Cat III Multilayer) and EPR compliance obligations.
                </div>
                <div className="mt-2 text-[10px] font-semibold text-emerald-800 uppercase tracking-wide">
                  EPR Target Rules &amp; Categories
                </div>
              </div>

              {/* Source 3: GS1 India */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">GS1 India DataKart</span>
                  <a
                    href="https://www.gs1india.org"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-800 hover:text-emerald-950"
                    title="Visit GS1 India"
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>
                <div className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Global Trade Item Number (GTIN-13 / EAN) barcode standards providing authoritative brand ownership, SKU specifications, and packaging material attributes.
                </div>
                <div className="mt-2 text-[10px] font-semibold text-emerald-800 uppercase tracking-wide">
                  GTIN Product Identity
                </div>
              </div>

              {/* Source 4: Open Food Facts & LCA */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Open Packaging Taxonomy</span>
                  <a
                    href="https://openfoodfacts.org"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-800 hover:text-emerald-950"
                    title="Visit Open Food Facts"
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>
                <div className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Crowdsourced Indian packaged product repository combined with published cradle-to-gate Life Cycle Assessment (LCA) emission coefficients.
                </div>
                <div className="mt-2 text-[10px] font-semibold text-emerald-800 uppercase tracking-wide">
                  Material CO₂e Footprint
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Copyright & Security Note */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-400 pt-6 border-t border-slate-100">
            <div>
              &copy; {new Date().getFullYear()} BharathLoop &middot; BBMP Bengaluru Urban Circular Pilot. All Rights Reserved.
            </div>
            <div className="text-slate-400">
              Anti-fraud single-use tokens &middot; Atomic SQLite ledger persistence &middot; Zero duplicate refund disbursement
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          initialMode={authModalMode}
        />
      )}
    </div>
  );
}
