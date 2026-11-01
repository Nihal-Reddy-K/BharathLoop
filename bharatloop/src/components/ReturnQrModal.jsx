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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#273E47]/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-[#E5DEC9] bg-[#FAF8F5] p-6 shadow-2xl text-[#273E47]">
        {/* Top bar */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5DEC9]">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#273E47]">
            <QrCode size={16} className="text-[#BD632F]" />
            BharathLoop Return Pass
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-[#EFEAE1] p-1.5 text-[#355070] hover:bg-[#E0D7C6] hover:text-[#273E47] transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Product Details Header */}
        <div className="mt-4 text-center">
          <span className="inline-block rounded-full bg-[#D8C99B]/30 px-3 py-1 text-xs font-bold text-[#BD632F] border border-[#D8C99B]">
            Deposit: ₹{packaging.deposit_inr.toFixed(2)} Refundable
          </span>
          <h3 className="mt-2 text-xl font-bold text-[#273E47] leading-tight">
            {packaging.brand} {packaging.product_name}
          </h3>
          <p className="text-xs text-[#355070] mt-0.5">
            Material: {packaging.material} · Token: <span className="font-mono font-semibold text-[#273E47]">{packaging.public_token}</span>
          </p>
        </div>

        {/* QR Code Container */}
        <div className="mt-5 flex flex-col items-center justify-center rounded-2xl bg-white border border-[#E5DEC9] p-5 shadow-xs">
          <div className="rounded-xl bg-[#FAF8F5] p-3 shadow-inner border border-[#E5DEC9]">
            <QRCodeSVG
              value={packaging.public_token}
              size={180}
              level="H"
              includeMargin={false}
              fgColor="#273E47"
            />
          </div>

          <div className="mt-3 flex items-center gap-2">
            <code className="text-xs font-mono font-bold tracking-wider text-[#273E47] bg-[#EFEAE1] px-3 py-1 rounded-lg">
              {packaging.public_token}
            </code>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-lg border border-[#E5DEC9] bg-[#FAF8F5] px-2 py-1 text-[11px] font-semibold text-[#355070] hover:bg-[#EFEAE1] transition shadow-xs cursor-pointer"
              title="Copy token code"
            >
              {copied ? <Check size={12} className="text-[#BD632F]" /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        {/* Verification Instructions */}
        <div className="mt-4 rounded-xl bg-[#EFEAE1]/60 p-3 text-xs text-[#355070] border border-[#E5DEC9] space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-[#273E47]">
            <ShieldCheck size={14} className="text-[#BD632F]" />
            Collection Instructions
          </div>
          <p className="text-[11px] text-[#355070] leading-relaxed">
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
            className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-[#BD632F] hover:bg-[#a85527] px-4 py-3 font-semibold text-white shadow-xs transition active:scale-[0.98] cursor-pointer"
          >
            <span>Verify in Collection Agent Mode</span>
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
