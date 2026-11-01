import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Copy, Check, QrCode, ArrowRight, ShieldCheck, MapPin } from "lucide-react";

export default function ReturnQrModal({ packaging, onClose, onTestInAgentMode, onSwitchToAgent }) {
  const [copied, setCopied] = useState(false);
  const handleAgentSwitch = onSwitchToAgent || onTestInAgentMode;

  if (!packaging) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(packaging.public_token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl text-slate-800">
        {/* Top bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-900">
            <QrCode size={16} className="text-emerald-700" />
            BharathLoop Return Pass
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-slate-100 p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Product Details Header */}
        <div className="mt-4 text-center">
          <span className="inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200/80">
            Deposit: ₹{packaging.deposit_inr.toFixed(2)} Refundable
          </span>
          <h3 className="mt-2 text-xl font-bold text-slate-900 leading-tight">
            {packaging.brand} {packaging.product_name}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Material: {packaging.material} · Token: <span className="font-mono font-semibold text-slate-700">{packaging.public_token}</span>
          </p>
        </div>

        {/* QR Code Container */}
        <div className="mt-5 flex flex-col items-center justify-center rounded-2xl bg-slate-50 border border-slate-200 p-5 shadow-inner">
          <div className="rounded-xl bg-white p-3 shadow-md border border-slate-100">
            <QRCodeSVG
              value={packaging.public_token}
              size={180}
              level="H"
              includeMargin={false}
              fgColor="#0f172a"
            />
          </div>

          <div className="mt-3 flex items-center gap-2">
            <code className="text-xs font-mono font-bold tracking-wider text-slate-900 bg-slate-200/70 px-3 py-1 rounded-lg">
              {packaging.public_token}
            </code>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition shadow-xs cursor-pointer"
              title="Copy token code"
            >
              {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        {/* Verification Instructions */}
        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 border border-slate-200 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <ShieldCheck size={14} className="text-emerald-700" />
            Collection Instructions
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Present this unique token to any BBMP Dry Waste Collection Centre (DWCC) or partner kiosk. Upon scanning, your ₹{packaging.deposit_inr.toFixed(2)} refund is instantly credited.
          </p>
        </div>

        {/* Demo Fast-Switch Action */}
        {handleAgentSwitch && (
          <button
            onClick={() => {
              onClose();
              handleAgentSwitch(packaging.public_token);
            }}
            className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-3 font-semibold text-white shadow-xs transition active:scale-[0.98] cursor-pointer"
          >
            <span>Verify in Collection Agent Mode</span>
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
