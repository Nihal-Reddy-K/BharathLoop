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
    <div className="border-b border-[#355070]/60 bg-[#273E47] text-slate-100 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#355070] text-[#D8C99B] border border-[#355070] shadow-xs">
              <Layers size={13} className="text-[#D8C99B]" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-100">
              3-Minute Deposit Loop Demonstrator
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onResetDemo}
              className="flex items-center gap-1.5 rounded-lg border border-[#355070] bg-[#355070]/70 px-2.5 py-1 text-xs font-semibold text-slate-100 hover:bg-[#355070] hover:text-white transition cursor-pointer"
              title="Reset sample state"
            >
              <RotateCcw size={12} />
              <span className="hidden sm:inline">Reset Demo</span>
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="rounded-lg p-1 text-slate-300 hover:text-white hover:bg-[#355070] transition cursor-pointer"
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
                      ? "bg-[#355070] border border-[#D8973C] shadow-xs ring-1 ring-[#D8973C]/40"
                      : "bg-[#1e3037]/80 hover:bg-[#203740] border border-[#355070]/40 hover:border-[#355070]"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <span
                      className={`h-1.5 w-1.5 rounded-full transition-colors ${
                        active ? "bg-[#D8973C] ring-2 ring-[#D8973C]/30" : "bg-slate-400"
                      }`}
                    />
                    <span className={active ? "text-white font-bold" : "text-slate-200 font-medium"}>
                      {step.label}
                    </span>
                  </div>
                  <div
                    className={`mt-1 text-[11px] leading-tight line-clamp-2 ${
                      active ? "text-[#D8C99B]" : "text-slate-300/80"
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
