import React, { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, ArrowRight, ShieldCheck, CheckCircle2, RotateCcw } from "lucide-react";

export default function DemoGuideBar({ currentStep, onSelectStep, onResetDemo }) {
  const [expanded, setExpanded] = useState(true);

  const steps = [
    { id: 1, label: "1. Scan & Lookup", desc: "GS1 / Open Food Facts resolution with Pfand deposit" },
    { id: 2, label: "2. Simulate Purchase", desc: "Pay deposit & generate unique return QR token" },
    { id: 3, label: "3. Agent Verify Return", desc: "Authorized collection agent scans QR & authorizes refund" },
    { id: 4, label: "4. Wallet & Voucher", desc: "View derived ledger balance & redeem single-use voucher" },
    { id: 5, label: "5. Anti-Fraud Test", desc: "Verify duplicate return is strictly rejected" },
  ];

  return (
    <div className="border-b border-emerald-900/10 bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-900 text-white shadow-md">
      <div className="mx-auto max-w-7xl px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400">
              <Sparkles size={14} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              3-Minute Pfand Loop Demonstrator
            </span>
            <span className="hidden sm:inline-block rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/30">
              India Pilot
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onResetDemo}
              className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-white/20 transition"
              title="Reset sample state"
            >
              <RotateCcw size={12} />
              <span className="hidden sm:inline">Reset Demo</span>
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="rounded-lg p-1 text-slate-300 hover:bg-white/10 transition"
              aria-label="Toggle demo guide"
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-2.5 grid grid-cols-2 gap-2 pb-1 sm:grid-cols-5">
            {steps.map((step) => {
              const active = currentStep === step.id;
              return (
                <button
                  key={step.id}
                  onClick={() => onSelectStep(step.id)}
                  className={`flex flex-col items-start rounded-xl p-2.5 text-left transition ${
                    active
                      ? "bg-emerald-500/25 border border-emerald-400/50 shadow-sm"
                      : "bg-white/5 hover:bg-white/10 border border-white/5"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-400 animate-pulse" : "bg-slate-400"}`} />
                    {step.label}
                  </div>
                  <div className="mt-1 text-[11px] leading-tight text-slate-300 line-clamp-2">
                    {step.desc}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
