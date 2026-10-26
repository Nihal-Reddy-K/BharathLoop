import React, { useState } from "react";
import {
  Recycle,
  ShoppingBag,
  Store,
  Factory,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ExternalLink,
} from "lucide-react";

import DemoGuideBar from "./components/DemoGuideBar";
import ConsumerView from "./components/ConsumerView";
import AgentView from "./components/AgentView";
import AdminView from "./components/AdminView";

const API_URL = "http://127.0.0.1:8000";

export default function App() {
  const [role, setRole] = useState("consumer"); // "consumer" | "agent" | "admin"
  const [consumerSubTab, setConsumerSubTab] = useState("scan"); // "scan" | "packagings" | "wallet"
  const [agentInitialToken, setAgentInitialToken] = useState("");
  const [demoStep, setDemoStep] = useState(1);

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
                  Pfand 2.0
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

          {/* Pilot Badge */}
          <div className="hidden lg:flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-900 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Bengaluru Pilot</span>
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

      {/* 4. Footer */}
      <footer className="border-t border-[#dce7df] bg-white px-6 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 text-sm text-[#718078] md:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#173d2b] text-white">
              <Recycle size={18} />
            </div>
            <div>
              <div className="font-bold text-slate-900">BharathLoop Pfand Demonstrator</div>
              <div className="text-xs text-slate-500">
                GTIN-anchored circular deposit-return system adapted for India
              </div>
            </div>
          </div>

          <div className="text-center md:text-right text-xs space-y-1">
            <div>
              Protected against duplicate refunds · Single-use cryptographically verifiable tokens
            </div>
            <div className="text-slate-400">
              Demo wallet for prototype demonstration. In-app balances reflect persistent SQLite ledger transactions.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
