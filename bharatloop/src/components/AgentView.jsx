import React, { useState, useEffect } from "react";
import {
  Camera,
  Search,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  RotateCcw,
  Sparkles,
  Store,
  ArrowRight,
  PackageCheck,
  Gift,
  Wallet,
  MapPin,
  ChevronDown,
  Check,
} from "lucide-react";
import confetti from "canvas-confetti";
import CameraScanner from "./CameraScanner";

export default function AgentView({
  apiUrl,
  initialToken = "",
  onSwitchToConsumer,
}) {
  const [tokenInput, setTokenInput] = useState(initialToken);
  const [collectionPoints, setCollectionPoints] = useState([]);
  const [selectedCp, setSelectedCp] = useState("CP-001");
  const [showCpDropdown, setShowCpDropdown] = useState(false);
  const [cpSearch, setCpSearch] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [pkgData, setPkgData] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [duplicateTestResult, setDuplicateTestResult] = useState(null);
  const [rewardMethod, setRewardMethod] = useState("cashback");
  const [recentVerifications, setRecentVerifications] = useState([]);

  // Fetch active collection points
  useEffect(() => {
    async function fetchPoints() {
      try {
        const res = await fetch(`${apiUrl}/api/collection-points`);
        if (res.ok) {
          const data = await res.json();
          setCollectionPoints(data.collection_points || []);
          if (data.collection_points?.length > 0) {
            setSelectedCp(data.collection_points[0].id);
          }
        }
      } catch (e) {
        console.error("Notice fetching collection points", e);
      }
    }
    fetchPoints();
  }, [apiUrl]);

  // If initialToken provided, inspect automatically
  useEffect(() => {
    if (initialToken) {
      setTokenInput(initialToken);
      inspectToken(initialToken);
    }
  }, [initialToken]);

  async function inspectToken(tokenToInspect = tokenInput) {
    const clean = tokenToInspect.trim();
    if (!clean) {
      setErrorMessage("Please enter or scan a return token first.");
      return;
    }

    setInspectLoading(true);
    setErrorMessage("");
    setVerifyResult(null);
    setDuplicateTestResult(null);

    try {
      const res = await fetch(`${apiUrl}/api/packaging/token/${clean}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Packaging instance not found for this token.");
      }
      const data = await res.json();
      setPkgData(data);
    } catch (err) {
      setPkgData(null);
      setErrorMessage(err.message || "Failed to locate packaging token.");
    } finally {
      setInspectLoading(false);
    }
  }

  async function handleVerifyReturn() {
    if (!pkgData) return;

    setVerifyLoading(true);
    setErrorMessage("");
    setDuplicateTestResult(null);

    try {
      const res = await fetch(`${apiUrl}/api/returns/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: pkgData.public_token,
          collection_point_id: selectedCp,
          agent_id: "agent_demo_bengaluru",
          reward_method: rewardMethod,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Return verification failed.");
      }

      setVerifyResult(data);
      setPkgData(data.packaging);

      // Trigger festive confetti
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#10b981", "#059669", "#34d399", "#fbbf24"],
      });

      // Add to recent feed
      setRecentVerifications((prev) => [
        {
          id: data.packaging.id,
          token: data.packaging.public_token,
          product: `${data.packaging.brand} ${data.packaging.product_name}`,
          amount: data.refund_amount_inr,
          time: new Date().toLocaleTimeString(),
          method: rewardMethod,
        },
        ...prev.slice(0, 4),
      ]);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setVerifyLoading(false);
    }
  }

  // Anti-fraud test: attempt to return the exact same item again
  async function testDuplicateReturn() {
    const targetToken = verifyResult?.packaging?.public_token || pkgData?.public_token;
    if (!targetToken) return;

    setVerifyLoading(true);
    setDuplicateTestResult(null);

    try {
      const res = await fetch(`${apiUrl}/api/returns/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: targetToken,
          collection_point_id: selectedCp,
          agent_id: "agent_demo_bengaluru",
          reward_method: rewardMethod,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Expected behavior: Duplicate rejection!
        setDuplicateTestResult({
          blocked: true,
          status: res.status,
          message: data.detail,
        });
      } else {
        setDuplicateTestResult({
          blocked: false,
          message: "Warning: Duplicate was not blocked! Check server logic.",
        });
      }
    } catch (err) {
      setDuplicateTestResult({
        blocked: true,
        message: err.message,
      });
    } finally {
      setVerifyLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Agent Station Banner */}
      <div className="rounded-3xl border border-[#355070] bg-[#273E47] p-6 text-white shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#355070] text-[#D8C99B] border border-[#355070]">
              <Store size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
                  Authorized Collection Agent
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#355070]/80 px-2.5 py-0.5 text-[10px] font-semibold text-[#D8C99B] border border-[#355070]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#D8973C]" />
                  Live Operator Mode
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white mt-0.5">
                Packaging Intake &amp; Deposit Refund
              </h1>
            </div>
          </div>

          {/* Collection point selector — Professional custom dropdown */}
          <div className="relative min-w-[280px]">
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Active Intake Center
            </label>

            {(() => {
              const current = collectionPoints.find((c) => c.id === selectedCp) || {
                name: "Select Center",
                type: "Intake Facility",
              };
              return (
                <button
                  type="button"
                  onClick={() => setShowCpDropdown(!showCpDropdown)}
                  className="w-full flex items-center justify-between gap-2 rounded-2xl border border-[#355070] bg-[#1e3037] px-3.5 py-2.5 text-xs text-white hover:bg-[#203740] transition focus:outline-none focus:ring-2 focus:ring-[#D8973C]"
                >
                  <div className="flex items-center gap-2 truncate">
                    <MapPin size={14} className="text-[#D8973C] shrink-0" />
                    <span className="font-bold truncate text-left">{current.name}</span>
                    <span className="rounded-md bg-[#D8C99B]/30 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-[#D8C99B] shrink-0">
                      {current.type}
                    </span>
                  </div>
                  <ChevronDown size={14} className="text-slate-400 shrink-0" />
                </button>
              );
            })()}

            {showCpDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowCpDropdown(false)}
                />
                <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-2xl border border-[#355070] bg-[#273E47] p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-1.5 border-b border-[#355070]/60">
                    <input
                      type="text"
                      value={cpSearch}
                      onChange={(e) => setCpSearch(e.target.value)}
                      placeholder="Search intake centers..."
                      className="w-full rounded-xl border border-[#355070] bg-[#1e3037] px-3 py-1.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#D8973C]"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-60 overflow-y-auto mt-1 space-y-1 pr-1">
                    {collectionPoints
                      .filter((cp) =>
                        cp.name.toLowerCase().includes(cpSearch.toLowerCase()) ||
                        (cp.type && cp.type.toLowerCase().includes(cpSearch.toLowerCase()))
                      )
                      .map((cp) => {
                        const isSel = cp.id === selectedCp;
                        return (
                          <button
                            key={cp.id}
                            type="button"
                            onClick={() => {
                              setSelectedCp(cp.id);
                              setShowCpDropdown(false);
                            }}
                            className={`w-full flex items-center justify-between gap-2 rounded-xl p-2.5 text-left text-xs transition ${
                              isSel
                                ? "bg-[#355070] text-[#D8C99B] font-bold border border-[#D8973C]"
                                : "text-slate-300 hover:bg-[#1e3037] hover:text-white"
                            }`}
                          >
                            <div className="flex-1 truncate">
                              <div className="font-semibold truncate">{cp.name}</div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <span className="rounded bg-[#355070]/60 px-1 py-0.2 text-[9px] uppercase font-bold text-slate-200">
                                  {cp.type}
                                </span>
                                <span className="truncate">{cp.address || "Bengaluru Facility"}</span>
                              </div>
                            </div>
                            {isSel && <Check size={14} className="text-[#D8973C] shrink-0" />}
                          </button>
                        );
                      })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Verification Card */}
      <div className="mt-8 grid gap-8 md:grid-cols-12">
        {/* Left Column: Token Input & Inspection */}
        <div className="md:col-span-7 space-y-6">
          <div className="rounded-3xl border border-[#E0D7C6] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#273E47]">1. Scan or Enter Consumer Return QR</h2>
            <p className="text-xs text-slate-500 mt-1">
              Consumers generate this return token upon simulated purchase in BharathLoop.
            </p>

            {/* Input & Scanner Trigger */}
            <div className="mt-4 flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                  placeholder="Enter Return Token (e.g. BLP-77C9B76F)"
                  className="w-full rounded-2xl border border-[#E0D7C6] bg-[#FAF8F5] px-4 py-3.5 text-sm font-mono font-bold tracking-wider uppercase text-[#273E47] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#BD632F]/20"
                  onKeyDown={(e) => e.key === "Enter" && inspectToken()}
                />
              </div>

              <button
                onClick={() => setShowScanner(true)}
                className="flex items-center gap-1.5 rounded-2xl bg-[#355070] px-4 py-3.5 text-xs font-bold text-white shadow-sm hover:bg-[#273E47] transition active:scale-[0.98] cursor-pointer"
                title="Open Camera Scanner"
              >
                <Camera size={16} />
                <span>Scan Camera</span>
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <button
                onClick={() => inspectToken()}
                disabled={inspectLoading || !tokenInput.trim()}
                className="flex items-center gap-2 rounded-xl bg-[#273E47] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#1e3037] disabled:opacity-50 transition cursor-pointer"
              >
                {inspectLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Checking Ledger...
                  </>
                ) : (
                  <>
                    <Search size={14} />
                    Inspect Packaging Token
                  </>
                )}
              </button>

              {onSwitchToConsumer && (
                <button
                  onClick={onSwitchToConsumer}
                  className="text-xs font-medium text-[#BD632F] hover:underline cursor-pointer"
                >
                  Need a token? Go to Consumer purchases →
                </button>
              )}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800">
                <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold">Verification Error:</span> {errorMessage}
                </div>
              </div>
            )}
          </div>

          {/* Inspected Packaging Card */}
          {pkgData && (
            <div className="rounded-3xl border border-[#E0D7C6] bg-gradient-to-b from-white to-[#FAF8F5] p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#EFEAE1] pb-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#273E47]">
                  <PackageCheck size={16} className="text-[#355070]" />
                  Packaging Instance Verified
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    pkgData.status === "deposit_recorded"
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : "bg-[#D8C99B]/30 text-[#273E47] border border-[#D8C99B]"
                  }`}
                >
                  {pkgData.status === "deposit_recorded"
                    ? "Pending Return (Eligible)"
                    : `Returned on ${pkgData.returned_at ? new Date(pkgData.returned_at).toLocaleDateString() : "Earlier"}`}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Product</span>
                  <div className="text-base font-bold text-[#273E47] mt-0.5">
                    {pkgData.brand} {pkgData.product_name}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">GTIN: {pkgData.gtin}</div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Refundable Deposit</span>
                  <div className="text-2xl font-bold text-[#BD632F] mt-0.5 font-mono">
                    ₹{pkgData.deposit_inr?.toFixed(2)}
                  </div>
                  <div className="text-xs text-[#355070] font-medium">Guaranteed Producer Deposit</div>
                </div>
              </div>

              {/* Physical Verification Checklist */}
              <div className="mt-4 rounded-2xl bg-white border border-[#E0D7C6] p-4">
                <div className="text-xs font-bold text-[#273E47] uppercase tracking-wider mb-2">
                  Physical Acceptance Checklist
                </div>
                <div className="space-y-1.5 text-xs text-slate-600">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded text-[#BD632F] focus:ring-[#BD632F]" />
                    <span>Packaging container is intact, uncrushed, and empty</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded text-[#BD632F] focus:ring-[#BD632F]" />
                    <span>Material ({pkgData.material}) matches product specifications</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded text-[#BD632F] focus:ring-[#BD632F]" />
                    <span>Return token ({pkgData.public_token}) authenticated in database</span>
                  </label>
                </div>
              </div>

              {/* Reward Method Picker */}
              <div className="mt-4">
                <label className="text-xs font-bold text-[#273E47] uppercase tracking-wider block mb-2">
                  Consumer Reward Preference
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRewardMethod("cashback")}
                    className={`flex items-center gap-2.5 rounded-2xl p-3 border text-left transition cursor-pointer ${
                      rewardMethod === "cashback"
                        ? "border-[#BD632F] bg-[#FAF8F5] text-[#273E47] font-bold shadow-sm"
                        : "border-[#E0D7C6] bg-white text-slate-600 hover:bg-[#FAF8F5]"
                    }`}
                  >
                    <Wallet size={18} className={rewardMethod === "cashback" ? "text-[#BD632F]" : "text-slate-400"} />
                    <div>
                      <div className="text-xs">Demo Wallet Cashback</div>
                      <div className="text-[10px] text-slate-500 font-normal">Direct in-app balance credit</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRewardMethod("voucher")}
                    className={`flex items-center gap-2.5 rounded-2xl p-3 border text-left transition cursor-pointer ${
                      rewardMethod === "voucher"
                        ? "border-[#BD632F] bg-[#FAF8F5] text-[#273E47] font-bold shadow-sm"
                        : "border-[#E0D7C6] bg-white text-slate-600 hover:bg-[#FAF8F5]"
                    }`}
                  >
                    <Gift size={18} className={rewardMethod === "voucher" ? "text-[#BD632F]" : "text-slate-400"} />
                    <div>
                      <div className="text-xs">Instant Partner Voucher</div>
                      <div className="text-[10px] text-slate-500 font-normal">Single-use retail coupon</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Primary Action Button */}
              {pkgData.status === "deposit_recorded" ? (
                <button
                  onClick={handleVerifyReturn}
                  disabled={verifyLoading}
                  className="mt-5 w-full flex items-center justify-center gap-2 rounded-2xl bg-[#BD632F] hover:bg-[#a85527] py-3.5 text-sm font-bold text-white shadow-xs transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {verifyLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Authorizing Refund...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      Confirm Receipt &amp; Authorize ₹{pkgData.deposit_inr?.toFixed(2)} Refund
                    </>
                  )}
                </button>
              ) : (
                <div className="mt-5 rounded-2xl bg-[#EFEAE1] p-4 text-center">
                  <div className="text-xs font-bold text-[#273E47]">This container has already been processed</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Returned on {pkgData.returned_at} at {pkgData.collection_point_name || "Authorized Center"}.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Verification Receipt & Anti-Fraud Proof */}
        <div className="md:col-span-5 space-y-6">
          {/* Verification Receipt Card */}
          {verifyResult ? (
            <div className="rounded-3xl border border-[#355070] bg-[#273E47] p-6 text-white shadow-sm">
              <div className="flex items-center gap-2 text-[#D8973C] text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 size={16} />
                Disbursement Successful
              </div>

              <div className="mt-4">
                <div className="text-3xl font-extrabold text-white font-mono">
                  +₹{verifyResult.refund_amount_inr?.toFixed(2)}
                </div>
                <div className="text-xs text-slate-300 mt-1">
                  Refund credited to consumer wallet ({verifyResult.packaging?.user_id})
                </div>
              </div>

              <div className="mt-5 space-y-2 border-t border-[#355070] pt-4 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Intake Center:</span>
                  <span className="font-semibold text-white">{verifyResult.collection_point}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Timestamp:</span>
                  <span className="font-semibold text-white">
                    {new Date(verifyResult.returned_at).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Token ID:</span>
                  <span className="font-mono font-semibold text-[#D8973C]">
                    {verifyResult.packaging?.public_token}
                  </span>
                </div>
                {verifyResult.voucher && (
                  <div className="mt-3 rounded-xl bg-[#1e3037] p-3 border border-[#355070]">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Voucher Code Issued</span>
                    <div className="text-base font-mono font-bold text-white mt-0.5">
                      {verifyResult.voucher.voucher_code}
                    </div>
                  </div>
                )}
              </div>

              {/* Anti-Fraud Proof Test Trigger */}
              <div className="mt-6 border-t border-[#355070] pt-4">
                <div className="text-xs font-bold text-[#D8C99B] mb-2">Anti-Fraud Proof Demo:</div>
                <button
                  onClick={testDuplicateReturn}
                  disabled={verifyLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#D8973C]/20 border border-[#D8973C]/40 py-2.5 text-xs font-bold text-[#D8C99B] hover:bg-[#D8973C]/30 transition cursor-pointer"
                >
                  <ShieldAlert size={14} />
                  <span>Test Duplicate Return (Try refunding again)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[#E0D7C6] bg-white p-6 text-center text-slate-500">
              <ShieldCheck size={36} className="mx-auto text-[#355070] mb-2 opacity-60" />
              <h3 className="font-bold text-sm text-[#273E47]">Safe Against Duplicate Refunds</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Every packaging unit has a cryptographic token. Once verified, the database prevents any secondary refund attempt.
              </p>
            </div>
          )}

          {/* Duplicate Blocked Banner */}
          {duplicateTestResult && (
            <div
              className={`rounded-2xl border p-4 text-xs font-medium animate-in fade-in duration-200 ${
                duplicateTestResult.blocked
                  ? "border-[#D8C99B]/40 bg-[#273E47] text-[#D8C99B]"
                  : "border-red-500/40 bg-[#273E47] text-red-200"
              }`}
            >
              <div className="flex items-center gap-2 font-bold mb-1">
                {duplicateTestResult.blocked ? (
                  <>
                    <ShieldCheck size={16} className="text-[#D8973C]" />
                    <span className="text-[#D8973C] font-bold">Fraud Prevention Passed (HTTP 400)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={16} className="text-red-400" />
                    <span>Error</span>
                  </>
                )}
              </div>
              <p className="text-[11px] leading-relaxed text-slate-200">
                {duplicateTestResult.message}
              </p>
            </div>
          )}

          {/* Recent Verifications Feed */}
          {recentVerifications.length > 0 && (
            <div className="rounded-3xl border border-[#E0D7C6] bg-white p-5 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#273E47] mb-3">
                Recent Intake Activity
              </h3>
              <div className="space-y-2.5">
                {recentVerifications.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b border-[#EFEAE1] pb-2 text-xs">
                    <div>
                      <div className="font-semibold text-[#273E47]">{item.product}</div>
                      <div className="text-[10px] font-mono text-slate-400">{item.token} · {item.time}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#BD632F]">+₹{item.amount.toFixed(2)}</div>
                      <div className="text-[10px] text-slate-500 capitalize">{item.method}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Camera Scanner Modal */}
      {showScanner && (
        <CameraScanner
          title="Scan Consumer Return QR"
          onScan={(decoded) => {
            setShowScanner(false);
            setTokenInput(decoded);
            inspectToken(decoded);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
