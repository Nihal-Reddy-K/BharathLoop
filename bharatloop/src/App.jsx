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
import AuthPortal from "./components/AuthPortal";
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
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

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

  const handleAuthenticated = (chosenRole) => {
    if (chosenRole) {
      setRole(chosenRole);
      if (chosenRole === "agent") setDemoStep(3);
      else if (chosenRole === "admin") setDemoStep(5);
      else {
        setDemoStep(1);
        setConsumerSubTab("scan");
      }
    }
  };

  const handleConfirmSignOut = () => {
    setIsSigningOut(true);
    setTimeout(() => {
      logout();
      setIsSigningOut(false);
      setShowSignOutModal(false);
      setShowUserMenu(false);
    }, 450);
  };

  // Gatekeeper: Website does not open up before sign up / sign in.
  // Sign up page appears first by default, and authenticated users are admitted.
  if (!isAuthenticated) {
    return (
      <AuthPortal
        initialMode="signup"
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#273E47] font-sans antialiased selection:bg-[#D8C99B] selection:text-[#273E47]">
      {/* 1. Interactive 3-Minute Guided Demo Tour Bar */}
      <DemoGuideBar
        currentStep={demoStep}
        onSelectStep={handleSelectDemoStep}
        onResetDemo={handleResetDemo}
      />

      {/* 2. Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-[#E5DEC9] bg-[#FAF8F5]/95 backdrop-blur-md shadow-2xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 overflow-x-auto scrollbar-none">
          {/* Brand Logo */}
          <button
            onClick={() => {
              setRole("consumer");
              setConsumerSubTab("scan");
            }}
            className="group flex shrink-0 items-center gap-3 text-left transition focus:outline-none cursor-pointer"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#273E47] text-[#D8973C] shadow-sm transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-105">
              <Recycle size={22} className="transition-transform duration-500 group-hover:rotate-180" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-extrabold tracking-tight text-[#273E47]">
                  Bharath<span className="text-[#BD632F]">Loop</span>
                </span>
                <span className="rounded-md bg-[#D8C99B]/30 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#273E47] border border-[#D8C99B]">
                  DRS 2.0
                </span>
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Deposit-Return Intelligence
              </div>
            </div>
          </button>

          {/* Role Mode Switcher */}
          <nav className="flex shrink-0 items-center rounded-2xl bg-[#EFEAE1] p-1 border border-[#E0D7C6] shadow-2xs">
            <button
              onClick={() => {
                setRole("consumer");
                setDemoStep(1);
              }}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                role === "consumer"
                  ? "bg-[#273E47] text-white shadow-xs"
                  : "text-[#355070] hover:text-[#273E47]"
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
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                role === "agent"
                  ? "bg-[#273E47] text-white shadow-xs"
                  : "text-[#355070] hover:text-[#273E47]"
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
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                role === "admin"
                  ? "bg-[#273E47] text-white shadow-xs"
                  : "text-[#355070] hover:text-[#273E47]"
              }`}
            >
              <Factory size={14} />
              <span className="hidden sm:inline">Producer / Admin</span>
              <span className="sm:hidden">Admin</span>
            </button>
          </nav>

          {/* Auth / User Area */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {/* Live Wallet Pill */}
            <button
              onClick={() => {
                setRole("consumer");
                setConsumerSubTab("wallet");
              }}
              className="flex items-center gap-1.5 rounded-xl border border-[#E0D7C6] bg-white px-2.5 sm:px-3 py-1.5 text-xs font-bold text-[#273E47] hover:bg-[#F5F1E8] hover:border-[#D8C99B] transition shadow-2xs cursor-pointer shrink-0"
              title="View Wallet & Redeem"
            >
              <Wallet size={14} className="text-[#BD632F]" />
              <span>₹{Number(walletBalance || 0).toFixed(2)}</span>
            </button>

            {/* User Profile Dropdown */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1.5 sm:gap-2 rounded-xl border border-[#E0D7C6] bg-white px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-[#273E47] hover:bg-[#F5F1E8] hover:border-[#D8C99B] transition shadow-2xs cursor-pointer shrink-0"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#355070] text-[#D8C99B] font-bold text-[11px] ring-1 ring-[#355070]/40">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <span className="hidden md:inline max-w-[110px] truncate font-medium">
                  {user?.name || "User"}
                </span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-2xl border border-[#E0D7C6] bg-white py-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-3 border-b border-[#EFEAE1]">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-bold text-[#273E47] truncate">{user?.name}</div>
                        <span className="shrink-0 rounded-md bg-[#D8C99B]/30 border border-[#D8C99B] px-1.5 py-0.5 text-[9px] font-bold text-[#273E47] uppercase tracking-wide">
                          {user?.role === "agent" ? "Agent" : user?.role === "admin" ? "Admin" : "Citizen"}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">{user?.email}</div>
                      {user?.phone && (
                        <div className="text-[11px] text-slate-400 mt-0.5">{user.phone}</div>
                      )}
                    </div>

                    <div className="px-4 py-2.5 bg-[#FAF8F5] border-b border-[#EFEAE1] flex items-center justify-between text-xs">
                      <span className="text-[#355070] font-semibold">Wallet Balance</span>
                      <span className="text-[#BD632F] font-extrabold font-mono text-sm">
                        ₹{Number(walletBalance || 0).toFixed(2)}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        setRole("consumer");
                        setConsumerSubTab("wallet");
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-[#273E47] hover:bg-[#FAF8F5] transition text-left cursor-pointer"
                    >
                      <Wallet size={14} className="text-[#BD632F]" />
                      <span>Redeem Cashback / Vouchers</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        setShowSignOutModal(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition text-left border-t border-[#EFEAE1] cursor-pointer"
                    >
                      <LogOut size={14} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Direct Smooth Sign Out Button */}
            <button
              onClick={() => setShowSignOutModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-[#E0D7C6] bg-white px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-[#355070] hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition shadow-2xs cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
              title="Sign Out of BharathLoop"
            >
              <LogOut size={13} className="text-[#355070]" />
              <span className="inline whitespace-nowrap">Sign Out</span>
            </button>
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
      <footer className="border-t border-[#E5DEC9] bg-[#F5F0E6] px-6 py-12">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Main Footer Brand Header */}
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center border-b border-[#E5DEC9]/80 pb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#273E47] text-[#D8973C] shadow-sm">
                <Recycle size={20} />
              </div>
              <div>
                <div className="text-base font-extrabold text-[#273E47]">
                  Bharath<span className="text-[#BD632F]">Loop</span> DRS Architecture
                </div>
                <div className="text-xs text-slate-500">
                  GTIN-anchored digital deposit-return system (DRS) tailored for Indian urban municipal ecosystems
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D8C99B] bg-[#D8C99B]/30 px-3 py-1 text-xs font-semibold text-[#273E47]">
                <ShieldCheck size={14} className="text-[#355070]" />
                BBMP Pilot Verified &middot; Bengaluru, Karnataka
              </span>
            </div>
          </div>

          {/* Official Data Sources & Regulatory Provenance Section */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#355070] mb-3 flex items-center gap-1.5">
              <Building2 size={14} className="text-[#355070]" />
              <span>Official Datasets &amp; Verification Sources</span>
            </h4>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Source 1: BBMP SWM */}
              <div className="rounded-2xl border border-[#E0D7C6] bg-white/90 p-4 hover:border-[#355070] transition shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#273E47]">BBMP SWM Network</span>
                  <a
                    href="https://site.bbmp.gov.in"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#BD632F] hover:text-[#9e4c1f]"
                    title="Visit BBMP Portal"
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>
                <div className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Ward-level Dry Waste Collection Centres (DWCCs) operated under BBMP Solid Waste Management Bye-Laws with partners <em>Hasiru Dala</em>, <em>Saahas Zero Waste</em>, and <em>Swachha Eco</em>.
                </div>
                <div className="mt-2 text-[10px] font-semibold text-[#BD632F] uppercase tracking-wide">
                  Intake Centers &amp; GPS Anchor
                </div>
              </div>

              {/* Source 2: CPCB / EPR */}
              <div className="rounded-2xl border border-[#E0D7C6] bg-white/90 p-4 hover:border-[#355070] transition shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#273E47]">CPCB &amp; MoEFCC EPR</span>
                  <a
                    href="https://cpcb.nic.in"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#BD632F] hover:text-[#9e4c1f]"
                    title="Visit CPCB Portal"
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>
                <div className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Plastic Waste Management Rules (PWM 2016, amended 2022). Packaging categories (Cat I Rigid, Cat II Flexible, Cat III Multilayer) and EPR compliance obligations.
                </div>
                <div className="mt-2 text-[10px] font-semibold text-[#BD632F] uppercase tracking-wide">
                  EPR Target Rules &amp; Categories
                </div>
              </div>

              {/* Source 3: GS1 India */}
              <div className="rounded-2xl border border-[#E0D7C6] bg-white/90 p-4 hover:border-[#355070] transition shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#273E47]">GS1 India DataKart</span>
                  <a
                    href="https://www.gs1india.org"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#BD632F] hover:text-[#9e4c1f]"
                    title="Visit GS1 India"
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>
                <div className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Global Trade Item Number (GTIN-13 / EAN) barcode standards providing authoritative brand ownership, SKU specifications, and packaging material attributes.
                </div>
                <div className="mt-2 text-[10px] font-semibold text-[#BD632F] uppercase tracking-wide">
                  GTIN Product Identity
                </div>
              </div>

              {/* Source 4: Open Food Facts & LCA */}
              <div className="rounded-2xl border border-[#E0D7C6] bg-white/90 p-4 hover:border-[#355070] transition shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#273E47]">Open Packaging Taxonomy</span>
                  <a
                    href="https://openfoodfacts.org"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#BD632F] hover:text-[#9e4c1f]"
                    title="Visit Open Food Facts"
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>
                <div className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Crowdsourced Indian packaged product repository combined with published cradle-to-gate Life Cycle Assessment (LCA) emission coefficients.
                </div>
                <div className="mt-2 text-[10px] font-semibold text-[#BD632F] uppercase tracking-wide">
                  Material CO₂e Footprint
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Copyright & Security Note */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-[#355070] pt-6 border-t border-[#E5DEC9]">
            <div>
              &copy; {new Date().getFullYear()} BharathLoop &middot; BBMP Bengaluru Urban Circular Pilot. All Rights Reserved.
            </div>
            <div className="text-[#355070]">
              Anti-fraud single-use tokens &middot; Atomic SQLite ledger persistence &middot; Zero duplicate refund disbursement
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal (if opened within app) */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          initialMode={authModalMode}
        />
      )}

      {/* Professional Smooth Sign Out Confirmation Modal */}
      {showSignOutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#273E47]/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-[#E5DEC9] animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#D8973C]/20 text-[#BD632F] border border-[#D8973C]/40">
                <LogOut size={22} />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#273E47] tracking-tight">
                  Sign out of BharathLoop?
                </h3>
                <p className="text-xs text-[#355070] mt-0.5">
                  Are you sure you want to end your current session?
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-[#FAF8F5] p-4 text-xs text-[#273E47] border border-[#E5DEC9] mb-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#355070]">Account</span>
                <span className="font-bold text-[#273E47]">{user?.name || "Aarav Sharma"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#355070]">Email</span>
                <span className="font-mono text-[#273E47]">{user?.email || "aarav.sharma@example.in"}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-[#E5DEC9]">
                <span className="text-[#355070] font-semibold">Saved Wallet Balance</span>
                <span className="font-mono font-extrabold text-[#BD632F] text-sm">
                  ₹{Number(walletBalance || 0).toFixed(2)}
                </span>
              </div>
              <div className="text-[11px] text-[#355070]/70 pt-1 leading-snug">
                Your returns, verified tokens, and balance will remain safely preserved.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isSigningOut}
                onClick={() => setShowSignOutModal(false)}
                className="rounded-xl border border-[#E5DEC9] bg-white px-4 py-2.5 text-xs font-bold text-[#273E47] hover:bg-[#FAF8F5] transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                Stay Signed In
              </button>
              <button
                type="button"
                disabled={isSigningOut}
                onClick={handleConfirmSignOut}
                className="flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-red-700/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isSigningOut ? (
                  <>
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    <span>Signing out...</span>
                  </>
                ) : (
                  <>
                    <LogOut size={14} />
                    <span>Confirm Sign Out</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
