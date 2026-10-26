import React, { useState, useEffect } from "react";
import {
  Camera,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Package,
  Recycle,
  Gift,
  Leaf,
  MapPin,
  ArrowRight,
  ShieldCheck,
  QrCode,
  Wallet,
  Clock,
  ExternalLink,
  ChevronRight,
  TrendingDown,
  Navigation,
  PlusCircle,
} from "lucide-react";
import confetti from "canvas-confetti";
import CameraScanner from "./CameraScanner";
import ReturnQrModal from "./ReturnQrModal";

export default function ConsumerView({
  apiUrl,
  activeSubTab = "scan",
  setActiveSubTab,
  onSwitchToAgent,
  demoGtin = "8909990000019",
}) {
  const [subTab, setSubTab] = useState(activeSubTab);
  const [gtin, setGtin] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [productResult, setProductResult] = useState(null);
  const [searchError, setSearchError] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  // Simulated purchase state
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [activeQrModalPkg, setActiveQrModalPkg] = useState(null);

  // User state
  const userId = "demo_consumer_blp";
  const [walletData, setWalletData] = useState(null);
  const [userPackagings, setUserPackagings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [walletLoading, setWalletLoading] = useState(false);

  // Voucher state
  const [voucherAmount, setVoucherAmount] = useState(10);
  const [voucherIssuing, setVoucherIssuing] = useState(false);
  const [redeemLoadingCode, setRedeemLoadingCode] = useState(null);
  const [redeemFeedback, setRedeemFeedback] = useState(null);

  // Manual register product modal
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regBrand, setRegBrand] = useState("");
  const [regName, setRegName] = useState("");
  const [regMaterial, setRegMaterial] = useState("PET");

  useEffect(() => {
    setSubTab(activeSubTab);
  }, [activeSubTab]);

  const handleSubTabChange = (t) => {
    setSubTab(t);
    if (setActiveSubTab) setActiveSubTab(t);
  };

  // Fetch wallet, packagings and transactions
  const fetchUserData = async () => {
    setWalletLoading(true);
    try {
      const [walRes, pkgRes, txRes] = await Promise.all([
        fetch(`${apiUrl}/api/wallet/${userId}`),
        fetch(`${apiUrl}/api/packaging/user/${userId}`),
        fetch(`${apiUrl}/api/wallet/${userId}/transactions`),
      ]);

      if (walRes.ok) {
        const w = await walRes.json();
        setWalletData(w);
      }
      if (pkgRes.ok) {
        const p = await pkgRes.json();
        setUserPackagings(p.packagings || []);
      }
      if (txRes.ok) {
        const t = await txRes.json();
        setTransactions(t.transactions || []);
      }
    } catch (e) {
      console.error("Notice updating user data", e);
    } finally {
      setWalletLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [apiUrl]);

  // Lookup product by GTIN
  async function handleLookup(codeToSearch = gtin) {
    const code = codeToSearch.trim();
    if (!code) {
      setSearchError("Please enter a GTIN or barcode number.");
      return;
    }

    setSearchLoading(true);
    setSearchError("");
    setProductResult(null);

    try {
      // Call both consumer verdict and product lookup
      const res = await fetch(`${apiUrl}/api/consumer/verdict/${code}`);
      const data = await res.json();

      if (!res.ok || !data.found) {
        setSearchError(`Product with barcode "${code}" was not found in GS1 or Open Food Facts.`);
        setProductResult({ notFound: true, gtin: code });
        return;
      }

      setProductResult(data);
    } catch (err) {
      setSearchError("Unable to reach BharatLoop API. Ensure the backend server is running.");
    } finally {
      setSearchLoading(false);
    }
  }

  // Record a simulated purchase & generate return token
  async function handleSimulatePurchase() {
    if (!productResult || productResult.notFound) return;

    setPurchaseLoading(true);
    try {
      const gtinCode = productResult.product.gtin;
      const res = await fetch(`${apiUrl}/api/demo/purchases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          gtin: gtinCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Purchase recording failed.");
      }

      // Trigger celebratory effect
      confetti({
        particleCount: 60,
        spread: 50,
        origin: { y: 0.6 },
        colors: ["#10b981", "#34d399", "#059669"],
      });

      // Update data and open Return QR Modal
      fetchUserData();
      setActiveQrModalPkg(data.packaging);
    } catch (err) {
      alert(`Simulation error: ${err.message}`);
    } finally {
      setPurchaseLoading(false);
    }
  }

  // Issue voucher from wallet balance
  async function handleIssueVoucher() {
    setVoucherIssuing(true);
    try {
      const res = await fetch(`${apiUrl}/api/vouchers/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          amount: parseFloat(voucherAmount),
          provider: "GyFTR Retail Partner",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Unable to issue voucher.");
      }

      confetti({ particleCount: 50, spread: 50, origin: { y: 0.7 } });
      fetchUserData();
    } catch (err) {
      alert(err.message);
    } finally {
      setVoucherIssuing(false);
    }
  }

  // Redeem single-use voucher server-side
  async function handleRedeemVoucher(code) {
    setRedeemLoadingCode(code);
    setRedeemFeedback(null);
    try {
      const res = await fetch(`${apiUrl}/api/vouchers/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voucher_code: code,
          user_id: userId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Redemption rejected.");
      }

      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#fbbf24", "#f59e0b", "#10b981"],
      });

      setRedeemFeedback({ success: true, message: data.message });
      fetchUserData();
    } catch (err) {
      setRedeemFeedback({ success: false, message: err.message });
    } finally {
      setRedeemLoadingCode(null);
    }
  }

  // Manual register product
  async function handleRegisterProduct(e) {
    e.preventDefault();
    try {
      const res = await fetch(`${apiUrl}/api/admin/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gtin: productResult?.gtin || gtin || "8909990009999",
          brand: regBrand || "Custom Brand",
          product: regName || "Beverage Bottle",
          material: regMaterial,
          weight_g: regMaterial === "Aluminium" ? 14 : regMaterial === "Glass" ? 220 : 25,
        }),
      });
      if (res.ok) {
        setShowRegisterModal(false);
        handleLookup(productResult?.gtin || gtin);
      }
    } catch (e) {
      alert("Registration failed");
    }
  }

  const sampleProducts = [
    { gtin: "8909990000019", name: "Bisleri 1L (PET)", deposit: "₹5.00" },
    { gtin: "8909990000040", name: "Sprite 250ml Can (Aluminium)", deposit: "₹10.00" },
    { gtin: "8909990000057", name: "Thums Up Glass (Returnable)", deposit: "₹5.00" },
    { gtin: "8909990000088", name: "Amul Gold 1L (HDPE)", deposit: "₹5.00" },
    { gtin: "3017620422003", name: "Nutella (Live Open Food Facts)", deposit: "₹5.00" },
  ];

  const activePackagings = userPackagings.filter((p) => p.status === "deposit_recorded");
  const returnedPackagings = userPackagings.filter((p) => p.status === "returned");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Consumer Sub-navigation Tabs */}
      <div className="flex items-center justify-center mb-8">
        <div className="inline-flex rounded-2xl bg-white p-1.5 shadow-sm border border-[#dce7df]">
          <button
            onClick={() => handleSubTabChange("scan")}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition ${
              subTab === "scan"
                ? "bg-[#173d2b] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Search size={15} />
            <span>Scan &amp; Discover</span>
          </button>

          <button
            onClick={() => handleSubTabChange("packagings")}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition ${
              subTab === "packagings"
                ? "bg-[#173d2b] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Package size={15} />
            <span>My Packaging &amp; Returns</span>
            {activePackagings.length > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-[10px] font-extrabold text-emerald-950">
                {activePackagings.length}
              </span>
            )}
          </button>

          <button
            onClick={() => handleSubTabChange("wallet")}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition ${
              subTab === "wallet"
                ? "bg-[#173d2b] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Wallet size={15} />
            <span>Demo Wallet &amp; Vouchers</span>
            {walletData?.wallet && (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                ₹{walletData.wallet.balance_inr?.toFixed(2)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* =========================================================
          TAB 1: SCAN & DISCOVER
      ========================================================= */}
      {subTab === "scan" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Hero Barcode Input Card */}
          <div className="relative overflow-hidden rounded-3xl border border-[#dce7df] bg-white p-6 sm:p-10 shadow-[0_12px_40px_rgba(23,61,43,0.06)]">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800">
                <Sparkles size={14} className="text-emerald-600" />
                Pfand Deposit &amp; Packaging Intelligence
              </span>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
                Scan barcode. <span className="text-emerald-800">Know your deposit.</span>
              </h1>
              <p className="mt-3 text-sm text-slate-600 max-w-xl mx-auto">
                Scan a real product barcode or enter a GTIN to view material recyclability, verified deposit value, and take-back actions.
              </p>

              {/* Barcode Search Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleLookup();
                }}
                className="mt-8 flex flex-col gap-3 sm:flex-row"
              >
                <div className="relative flex-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                    <Search size={20} />
                  </div>
                  <input
                    type="text"
                    value={gtin}
                    onChange={(e) => setGtin(e.target.value)}
                    placeholder="Enter EAN-13 / GTIN barcode (e.g. 8909990000019)"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-700/20 bg-emerald-50 px-6 py-4 text-sm font-bold text-emerald-900 hover:bg-emerald-100 transition active:scale-[0.98]"
                  title="Open Camera Scanner"
                >
                  <Camera size={18} className="text-emerald-700" />
                  <span>Scan Camera</span>
                </button>

                <button
                  type="submit"
                  disabled={searchLoading}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-[#173d2b] px-8 py-4 text-sm font-bold text-white shadow-md hover:bg-[#204e38] transition active:scale-[0.98] disabled:opacity-50"
                >
                  {searchLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Resolving...</span>
                    </>
                  ) : (
                    <>
                      <span>Inspect</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              {/* Quick Sample Picks */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-600">Try Sample Barcodes:</span>
                {sampleProducts.map((p) => (
                  <button
                    key={p.gtin}
                    onClick={() => {
                      setGtin(p.gtin);
                      handleLookup(p.gtin);
                    }}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-emerald-900 hover:border-emerald-600 hover:bg-emerald-50 transition"
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              {searchError && (
                <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700">
                  <AlertCircle size={16} />
                  <span>{searchError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Product Lookup Result Section */}
          {productResult && !productResult.notFound && (
            <div className="rounded-3xl border border-[#dce7df] bg-white p-6 sm:p-8 shadow-sm">
              {/* Product Identity Header */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-900">
                      <CheckCircle2 size={13} className="text-emerald-700" />
                      Product Resolved
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                      Source: {productResult.product?.product_identity_source || "Verified Catalog"}
                    </span>
                  </div>
                  <h2 className="text-3xl font-extrabold text-slate-900 mt-2">
                    {productResult.product?.brand} {productResult.product?.product}
                  </h2>
                  <div className="text-xs text-slate-500 mt-1">
                    GTIN: <span className="font-mono font-bold text-slate-700">{productResult.product?.gtin}</span> · Category: {productResult.product?.category}
                  </div>
                </div>

                {/* Pfand Deposit Highlight Card */}
                <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 text-right min-w-[200px]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                    Refundable Pfand Deposit
                  </span>
                  <div className="text-3xl font-extrabold text-emerald-900 mt-0.5">
                    ₹{productResult.pfand_deposit?.deposit_inr?.toFixed(2) || "5.00"}
                  </div>
                  <span className="text-[10px] text-emerald-700 font-medium">
                    100% Refundable on physical return
                  </span>
                </div>
              </div>

              {/* Material & Circular Spec Cards */}
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                    <Package size={16} className="text-emerald-700" />
                    Packaging Material
                  </span>
                  <div className="text-lg font-bold text-slate-900 mt-1">{productResult.product?.material}</div>
                  <div className="text-xs text-slate-500">{productResult.product?.weight_g}g ({productResult.product?.layers || "mono-layer"})</div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                    <Recycle size={16} className="text-emerald-700" />
                    Recyclability &amp; EPR
                  </span>
                  <div className="text-lg font-bold text-slate-900 mt-1">
                    {productResult.epr?.recyclability_pct || "85"}%
                  </div>
                  <div className="text-xs text-slate-500">{productResult.epr?.category || "Cat I Rigid"}</div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                    <Leaf size={16} className="text-emerald-700" />
                    CO₂e Footprint
                  </span>
                  <div className="text-lg font-bold text-slate-900 mt-1">
                    {Math.round((productResult.environment?.co2e_kg || 0.065) * 1000)}g
                  </div>
                  <div className="text-xs text-slate-500">Material emission footprint</div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                    <Gift size={16} className="text-emerald-700" />
                    Cashback Reward
                  </span>
                  <div className="text-lg font-bold text-slate-900 mt-1">
                    ₹{productResult.pfand_deposit?.deposit_inr?.toFixed(2) || "5.00"}
                  </div>
                  <div className="text-xs text-slate-500">Demo Wallet / GyFTR Voucher</div>
                </div>
              </div>

              {/* Action Banner: Simulate Purchase & Take-Back Instructions */}
              <div className="mt-8 rounded-3xl border border-emerald-900/10 bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 p-6 text-white shadow-lg">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 border border-emerald-500/30">
                        Interactive Demonstrator Action
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white mt-1.5">
                      Simulate Purchase &amp; Generate Return Pass
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl">
                      Simulate buying this product (retail price ₹20.00 + refundable deposit ₹{productResult.pfand_deposit?.deposit_inr?.toFixed(2) || "5.00"}). This records the deposit in your ledger and generates a unique tamper-proof Return QR!
                    </p>
                  </div>

                  <button
                    onClick={handleSimulatePurchase}
                    disabled={purchaseLoading}
                    className="flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 px-6 py-4 text-sm font-extrabold text-emerald-950 shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-300 transition active:scale-[0.98] disabled:opacity-50"
                  >
                    {purchaseLoading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Recording Purchase...
                      </>
                    ) : (
                      <>
                        <QrCode size={18} />
                        Simulate Purchase (Pay Deposit)
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Nearest Drop-off Center Info */}
              {productResult.dropoff && (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
                    <MapPin size={16} className="text-emerald-700" />
                    Nearest Authorized Intake Center
                  </div>
                  <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{productResult.dropoff.name}</div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        Accepts: {productResult.dropoff.accepts} · {productResult.dropoff.routing_source}
                      </div>
                    </div>
                    <div className="text-right sm:text-right">
                      <div className="font-bold text-emerald-800 text-sm">
                        {productResult.dropoff.distance_km} km away
                      </div>
                      <div className="text-xs text-slate-500">~{productResult.dropoff.duration_min} min travel</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Honest Product Not Found Card */}
          {productResult?.notFound && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50/60 p-8 text-center max-w-2xl mx-auto">
              <AlertCircle size={40} className="mx-auto text-amber-600 mb-3" />
              <h3 className="text-lg font-bold text-slate-900">Product Not Found in Database</h3>
              <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                Barcode <code className="font-mono font-bold text-amber-900">{productResult.gtin}</code> has not yet been registered by a producer or cached from Open Food Facts. BharathLoop never fabricates fake products.
              </p>
              <button
                onClick={() => {
                  setRegBrand("");
                  setRegName("");
                  setShowRegisterModal(true);
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-800 px-5 py-2.5 text-xs font-bold text-white hover:bg-amber-700 transition"
              >
                <PlusCircle size={15} />
                Register this Product in Pilot Catalog
              </button>
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 2: MY PACKAGING & RETURNS
      ========================================================= */}
      {subTab === "packagings" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">My Packaging &amp; Return Passes</h2>
              <p className="text-xs text-slate-500">
                Packaging instances purchased by you with active refundable deposits held.
              </p>
            </div>
            <button
              onClick={() => handleSubTabChange("scan")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#173d2b] px-4 py-2 text-xs font-bold text-white hover:bg-[#204e38] transition"
            >
              <Search size={14} />
              Scan another item
            </button>
          </div>

          {/* Active Packaging Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              Active in Circulation ({activePackagings.length})
            </h3>

            {activePackagings.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
                <Package size={36} className="mx-auto text-slate-400 mb-2 opacity-50" />
                <div className="text-sm font-bold text-slate-700">No packaging currently in circulation</div>
                <div className="text-xs text-slate-500 mt-1">
                  Scan a product and click "Simulate Purchase" to generate your first return pass!
                </div>
                <button
                  onClick={() => handleSubTabChange("scan")}
                  className="mt-3 text-xs font-bold text-emerald-800 hover:underline"
                >
                  Browse catalog &amp; simulate purchase →
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activePackagings.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-white p-5 shadow-sm hover:shadow-md transition"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        {pkg.public_token}
                      </span>
                      <span className="text-xs font-extrabold text-emerald-800">
                        ₹{pkg.deposit_inr?.toFixed(2)} Deposit
                      </span>
                    </div>

                    <div className="mt-3">
                      <h4 className="font-bold text-slate-900 text-base">{pkg.brand} {pkg.product_name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Material: {pkg.material}</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Purchased: {new Date(pkg.created_at).toLocaleDateString()} {new Date(pkg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => setActiveQrModalPkg(pkg)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
                      >
                        <QrCode size={14} />
                        <span>View Return QR</span>
                      </button>

                      <button
                        onClick={() => {
                          if (onSwitchToAgent) onSwitchToAgent(pkg.public_token);
                        }}
                        className="flex items-center justify-center rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-900 hover:bg-emerald-100 transition border border-emerald-200"
                        title="Open directly in collection agent mode"
                      >
                        Verify →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Returned History Section */}
          {returnedPackagings.length > 0 && (
            <div className="mt-8 space-y-4 pt-6 border-t border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-700" />
                Successfully Returned &amp; Refunded ({returnedPackagings.length})
              </h3>

              <div className="grid gap-3 sm:grid-cols-2">
                {returnedPackagings.map((pkg) => (
                  <div key={pkg.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs">
                    <div className="flex justify-between items-center font-bold text-slate-900">
                      <span>{pkg.brand} {pkg.product_name}</span>
                      <span className="text-emerald-700">+₹{pkg.deposit_inr?.toFixed(2)} Refunded</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Token: <span className="font-mono">{pkg.public_token}</span> · Intake at: {pkg.collection_point_name || "Authorized Center"}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Returned: {new Date(pkg.returned_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 3: DEMO WALLET & VOUCHERS
      ========================================================= */}
      {subTab === "wallet" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Wallet Overview Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-900 to-teal-950 p-6 text-white shadow-md">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <Wallet size={16} />
                Available Demo Balance
              </span>
              <div className="text-4xl font-extrabold text-white mt-2">
                ₹{walletData?.wallet?.balance_inr?.toFixed(2) || "0.00"}
              </div>
              <div className="text-[11px] text-emerald-300/80 mt-1">
                Refreshed live from persistent ledger transactions
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Package size={16} className="text-amber-600" />
                Active Deposits Held
              </span>
              <div className="text-4xl font-extrabold text-slate-900 mt-2">
                ₹{walletData?.wallet?.deposits_held_inr?.toFixed(2) || "0.00"}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Held in {walletData?.active_packagings_count || 0} packaging units in circulation
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-700" />
                Lifetime Refunds Earned
              </span>
              <div className="text-4xl font-extrabold text-emerald-800 mt-2">
                ₹{walletData?.wallet?.total_refunded_inr?.toFixed(2) || "0.00"}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                From {walletData?.returned_packagings_count || 0} verified physical returns
              </div>
            </div>
          </div>

          {/* Working Voucher Converter & Active Vouchers */}
          <div className="grid gap-8 md:grid-cols-12">
            {/* Convert Balance to Voucher */}
            <div className="md:col-span-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
                <Gift size={16} className="text-emerald-600" />
                Convert Balance to Partner Voucher
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Convert your verified recycling cashback into a single-use retail voucher.
              </p>

              <div className="mt-4">
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Select Voucher Amount</label>
                <div className="grid grid-cols-3 gap-2">
                  {[5, 10, 20].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setVoucherAmount(amt)}
                      className={`rounded-xl py-2 text-xs font-bold border transition ${
                        voucherAmount === amt
                          ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      ₹{amt}.00
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Partner Brand</label>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-700 font-medium">
                  GyFTR Corporate Rewards / Retail Partner
                </div>
              </div>

              <button
                onClick={handleIssueVoucher}
                disabled={voucherIssuing || (walletData?.wallet?.balance_inr || 0) < voucherAmount}
                className="mt-5 w-full flex items-center justify-center gap-2 rounded-2xl bg-[#173d2b] py-3 text-xs font-bold text-white shadow-sm hover:bg-[#204e38] transition disabled:opacity-40"
              >
                {voucherIssuing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Generating Voucher...
                  </>
                ) : (
                  <>
                    <Gift size={14} />
                    Issue ₹{voucherAmount}.00 Voucher
                  </>
                )}
              </button>

              {(walletData?.wallet?.balance_inr || 0) < voucherAmount && (
                <div className="text-[11px] text-amber-700 mt-2 text-center">
                  Insufficient balance. Return packaging to earn more cashback!
                </div>
              )}
            </div>

            {/* My Vouchers List & Redemption */}
            <div className="md:col-span-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900">My Vouchers &amp; Single-Use Redemption</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Vouchers generated on return or from wallet. Each code is single-use and verified server-side.
              </p>

              {redeemFeedback && (
                <div
                  className={`mt-3 rounded-2xl p-3 text-xs font-medium border flex items-center gap-2 ${
                    redeemFeedback.success
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-red-200 bg-red-50 text-red-800"
                  }`}
                >
                  {redeemFeedback.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{redeemFeedback.message}</span>
                </div>
              )}

              <div className="mt-4 space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {(!walletData?.vouchers || walletData.vouchers.length === 0) ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No vouchers issued yet. Convert your balance or select voucher reward on return.
                  </div>
                ) : (
                  walletData.vouchers.map((vch) => {
                    const isRedeemed = vch.status === "redeemed";
                    return (
                      <div
                        key={vch.voucher_id}
                        className={`rounded-2xl border p-4 transition ${
                          isRedeemed ? "border-slate-200 bg-slate-50 opacity-70" : "border-emerald-200 bg-emerald-50/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-bold text-slate-900 tracking-wider">
                                {vch.voucher_code}
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                  isRedeemed ? "bg-slate-200 text-slate-600" : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                {vch.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1">
                              Amount: <span className="font-bold text-slate-800">₹{vch.amount_inr?.toFixed(2)}</span> · Provider: {vch.provider}
                            </div>
                          </div>

                          {!isRedeemed ? (
                            <button
                              onClick={() => handleRedeemVoucher(vch.voucher_code)}
                              disabled={redeemLoadingCode === vch.voucher_code}
                              className="rounded-xl bg-emerald-800 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition active:scale-[0.98] disabled:opacity-50"
                            >
                              {redeemLoadingCode === vch.voucher_code ? "Redeeming..." : "Redeem Now"}
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium">
                              Redeemed on {vch.redeemed_at ? new Date(vch.redeemed_at).toLocaleDateString() : "earlier"}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Immutable Transaction Ledger History Table */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Transaction Ledger History</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Every deposit and refund is recorded as an immutable ledger transaction.
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-slate-400">
                {transactions.length} entries
              </span>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                    <th className="py-2.5">Transaction ID</th>
                    <th className="py-2.5">Type</th>
                    <th className="py-2.5">Description</th>
                    <th className="py-2.5">Date &amp; Time</th>
                    <th className="py-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No transactions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => {
                      const isCredit = tx.type === "REFUND" || tx.type === "CREDIT";
                      return (
                        <tr key={tx.transaction_id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 font-mono text-[11px] text-slate-500">{tx.transaction_id}</td>
                          <td className="py-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                isCredit
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {tx.type}
                            </span>
                          </td>
                          <td className="py-3 font-medium text-slate-900 max-w-xs truncate">{tx.description}</td>
                          <td className="py-3 text-slate-500 text-[11px]">
                            {new Date(tx.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className={`py-3 text-right font-bold ${isCredit ? "text-emerald-700" : "text-slate-800"}`}>
                            {isCredit ? "+" : ""}₹{Math.abs(tx.amount_inr).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Return QR Code Modal */}
      {activeQrModalPkg && (
        <ReturnQrModal
          packaging={activeQrModalPkg}
          onClose={() => setActiveQrModalPkg(null)}
          onTestInAgentMode={(token) => {
            setActiveQrModalPkg(null);
            if (onSwitchToAgent) onSwitchToAgent(token);
          }}
        />
      )}

      {/* Camera Scanner Modal */}
      {showScanner && (
        <CameraScanner
          title="Scan Product Barcode"
          onScan={(decoded) => {
            setShowScanner(false);
            setGtin(decoded);
            handleLookup(decoded);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Manual Product Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Register Product in Catalog</h3>
            <p className="text-xs text-slate-500 mt-1">
              Add packaging details for barcode <code className="font-mono font-bold text-emerald-900">{productResult?.gtin || gtin}</code>
            </p>

            <form onSubmit={handleRegisterProduct} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Brand Name</label>
                <input
                  type="text"
                  required
                  value={regBrand}
                  onChange={(e) => setRegBrand(e.target.value)}
                  placeholder="e.g. Kinley, Tata Tea, Nestle"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Product Description</label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. 500ml Bottled Water"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Packaging Material</label>
                <select
                  value={regMaterial}
                  onChange={(e) => setRegMaterial(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                >
                  <option value="PET">PET (Clear rigid plastic)</option>
                  <option value="Aluminium">Aluminium (Beverage can)</option>
                  <option value="Glass">Glass (Returnable bottle)</option>
                  <option value="HDPE">HDPE (Rigid bottle/jar)</option>
                  <option value="PP">PP (Rigid cup/container)</option>
                  <option value="LDPE">LDPE (Mono pouch)</option>
                  <option value="Multilayer">Multilayer (Flexible laminate)</option>
                </select>
              </div>

              <div className="mt-5 flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#173d2b] py-2.5 text-xs font-bold text-white hover:bg-[#204e38]"
                >
                  Save &amp; Resolve
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
