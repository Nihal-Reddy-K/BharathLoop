import React, { useState } from "react";
import { Layers, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";

export default function DemoGuideBar({ currentStep, onSelectStep, onResetDemo }) {
  const [expanded, setExpanded] = useState(true);

  const steps = [
    { id: 1, label: "1. Scan & Lookup", desc: "GS1 / Open Food Facts resolution with refundable deposit" },
    { id: 2, label: "2. Simulate Purchase", desc: "Pay deposit & generate unique return QR token" },
    { id: 3, label: "3. Agent Verify Return", desc: "Authorized collection agent scans QR & authorizes refund" },
    { id: 4, label: "4. Wallet & Voucher", desc: "View derived ledger balance & redeem single-use voucher" },
    { id: 5, label: "5. Anti-Fraud Test", desc: "Verify duplicate return is strictly rejected" },
  ];

  return (
    <div className="border-b border-slate-800 bg-[#0f172a] text-slate-100 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-800 text-slate-300 border border-slate-700/80 shadow-xs">
              <Layers size={13} className="text-slate-300" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              3-Minute Deposit Loop Demonstrator
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-slate-800/90 px-2.5 py-0.5 text-[10px] font-semibold text-slate-300 border border-slate-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              India Pilot
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onResetDemo}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition cursor-pointer"
              title="Reset sample state"
            >
              <RotateCcw size={12} />
              <span className="hidden sm:inline">Reset Demo</span>
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              aria-label="Toggle demo guide"
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1.5 lg:grid lg:grid-cols-5 scrollbar-none">
            {steps.map((step) => {
              const active = currentStep === step.id;
              return (
                <button
                  key={step.id}
                  onClick={() => onSelectStep(step.id)}
                  className={`flex shrink-0 min-w-[190px] lg:min-w-0 flex-1 flex-col items-start rounded-xl p-2.5 text-left transition-all cursor-pointer ${
                    active
                      ? "bg-slate-800 border border-emerald-500/60 shadow-xs ring-1 ring-emerald-500/20"
                      : "bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <span
                      className={`h-1.5 w-1.5 rounded-full transition-colors ${
                        active ? "bg-emerald-400 ring-2 ring-emerald-400/30" : "bg-slate-500"
                      }`}
                    />
                    <span className={active ? "text-white font-bold" : "text-slate-300 font-medium"}>
                      {step.label}
                    </span>
                  </div>
                  <div
                    className={`mt-1 text-[11px] leading-tight line-clamp-2 ${
                      active ? "text-slate-300" : "text-slate-400"
                    }`}
                  >
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
