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
      <div className="rounded-3xl border border-emerald-900/10 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Store size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                  Authorized Collection Agent
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
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
                  className="w-full flex items-center justify-between gap-2 rounded-2xl border border-slate-700 bg-slate-800/90 px-3.5 py-2.5 text-xs text-white hover:bg-slate-800 transition focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <div className="flex items-center gap-2 truncate">
                    <MapPin size={14} className="text-emerald-400 shrink-0" />
                    <span className="font-bold truncate text-left">{current.name}</span>
                    <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-emerald-300 shrink-0">
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
                <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-1.5 border-b border-slate-800">
                    <input
                      type="text"
                      value={cpSearch}
                      onChange={(e) => setCpSearch(e.target.value)}
                      placeholder="Search intake centers..."
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
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
                                ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30"
                                : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            }`}
                          >
                            <div className="flex-1 truncate">
                              <div className="font-semibold truncate">{cp.name}</div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <span className="rounded bg-slate-800 px-1 py-0.2 text-[9px] uppercase font-bold text-slate-300">
                                  {cp.type}
                                </span>
                                <span className="truncate">{cp.address || "Bengaluru Facility"}</span>
                              </div>
                            </div>
                            {isSel && <Check size={14} className="text-emerald-400 shrink-0" />}
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
          <div className="rounded-3xl border border-[#dce7df] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">1. Scan or Enter Consumer Return QR</h2>
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
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-mono font-bold tracking-wider uppercase text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                  onKeyDown={(e) => e.key === "Enter" && inspectToken()}
                />
              </div>

              <button
                onClick={() => setShowScanner(true)}
                className="flex items-center gap-1.5 rounded-2xl bg-emerald-800 px-4 py-3.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition active:scale-[0.98]"
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
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition"
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
                  className="text-xs font-medium text-emerald-800 hover:underline"
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
            <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-white to-emerald-50/30 p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
                  <PackageCheck size={16} className="text-emerald-600" />
                  Packaging Instance Verified
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    pkgData.status === "deposit_recorded"
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : "bg-emerald-100 text-emerald-800 border border-emerald-300"
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
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {pkgData.brand} {pkgData.product_name}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">GTIN: {pkgData.gtin}</div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Refundable Deposit</span>
                  <div className="text-2xl font-bold text-emerald-800 mt-0.5">
                    ₹{pkgData.deposit_inr?.toFixed(2)}
                  </div>
                  <div className="text-xs text-emerald-700 font-medium">Guaranteed Producer Deposit</div>
                </div>
              </div>

              {/* Physical Verification Checklist */}
              <div className="mt-4 rounded-2xl bg-white border border-slate-200 p-4">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Physical Acceptance Checklist
                </div>
                <div className="space-y-1.5 text-xs text-slate-600">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded text-emerald-600 focus:ring-emerald-500" />
                    <span>Packaging container is intact, uncrushed, and empty</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded text-emerald-600 focus:ring-emerald-500" />
                    <span>Material ({pkgData.material}) matches product specifications</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded text-emerald-600 focus:ring-emerald-500" />
                    <span>Return token ({pkgData.public_token}) authenticated in database</span>
                  </label>
                </div>
              </div>

              {/* Reward Method Picker */}
              <div className="mt-4">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  Consumer Reward Preference
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRewardMethod("cashback")}
                    className={`flex items-center gap-2.5 rounded-2xl p-3 border text-left transition ${
                      rewardMethod === "cashback"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Wallet size={18} className={rewardMethod === "cashback" ? "text-emerald-700" : "text-slate-400"} />
                    <div>
                      <div className="text-xs">Demo Wallet Cashback</div>
                      <div className="text-[10px] text-slate-500 font-normal">Direct in-app balance credit</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRewardMethod("voucher")}
                    className={`flex items-center gap-2.5 rounded-2xl p-3 border text-left transition ${
                      rewardMethod === "voucher"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Gift size={18} className={rewardMethod === "voucher" ? "text-emerald-700" : "text-slate-400"} />
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
                  className="mt-5 w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-800 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 hover:from-emerald-600 hover:to-teal-700 transition active:scale-[0.98] disabled:opacity-50"
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
                <div className="mt-5 rounded-2xl bg-slate-100 p-4 text-center">
                  <div className="text-xs font-bold text-slate-700">This container has already been processed</div>
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
            <div className="rounded-3xl border border-emerald-500 bg-emerald-950 p-6 text-white shadow-xl">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 size={16} />
                Disbursement Successful
              </div>

              <div className="mt-4">
                <div className="text-3xl font-extrabold text-white">
                  +₹{verifyResult.refund_amount_inr?.toFixed(2)}
                </div>
                <div className="text-xs text-emerald-300 mt-1">
                  Refund credited to consumer wallet ({verifyResult.packaging?.user_id})
                </div>
              </div>

              <div className="mt-5 space-y-2 border-t border-emerald-800/80 pt-4 text-xs text-slate-300">
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
                  <span className="font-mono font-semibold text-emerald-300">
                    {verifyResult.packaging?.public_token}
                  </span>
                </div>
                {verifyResult.voucher && (
                  <div className="mt-3 rounded-xl bg-emerald-900/80 p-3 border border-emerald-700">
                    <span className="text-[10px] uppercase font-bold text-emerald-300">Voucher Code Issued</span>
                    <div className="text-base font-mono font-bold text-white mt-0.5">
                      {verifyResult.voucher.voucher_code}
                    </div>
                  </div>
                )}
              </div>

              {/* Anti-Fraud Proof Test Trigger */}
              <div className="mt-6 border-t border-emerald-800/80 pt-4">
                <div className="text-xs font-bold text-emerald-300 mb-2">Anti-Fraud Proof Demo:</div>
                <button
                  onClick={testDuplicateReturn}
                  disabled={verifyLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500/20 border border-amber-400/40 py-2.5 text-xs font-bold text-amber-200 hover:bg-amber-500/30 transition"
                >
                  <ShieldAlert size={14} />
                  <span>Test Duplicate Return (Try refunding again)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
              <ShieldCheck size={36} className="mx-auto text-emerald-600 mb-2 opacity-60" />
              <h3 className="font-bold text-sm text-slate-700">Safe Against Duplicate Refunds</h3>
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
                  ? "border-emerald-500/30 bg-emerald-950 text-emerald-200"
                  : "border-red-500 bg-red-950 text-red-200"
              }`}
            >
              <div className="flex items-center gap-2 font-bold mb-1">
                {duplicateTestResult.blocked ? (
                  <>
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Fraud Prevention Passed (HTTP 400)</span>
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
            <div className="rounded-3xl border border-[#dce7df] bg-white p-5 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                Recent Intake Activity
              </h3>
              <div className="space-y-2.5">
                {recentVerifications.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
                    <div>
                      <div className="font-semibold text-slate-800">{item.product}</div>
                      <div className="text-[10px] font-mono text-slate-400">{item.token} · {item.time}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-700">+₹{item.amount.toFixed(2)}</div>
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
