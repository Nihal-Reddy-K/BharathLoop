import React, { useState, useEffect, useMemo } from "react";
import {
  Camera,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
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
  ChevronRight,
  Navigation,
  PlusCircle,
  Map,
  Compass,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Building2,
  Filter,
  CreditCard,
  Send,
  Download,
  Info,
  CheckCheck,
} from "lucide-react";
import confetti from "canvas-confetti";
import CameraScanner from "./CameraScanner";
import ReturnQrModal from "./ReturnQrModal";
import DropoffMap, { calculateHaversineDistance } from "./DropoffMap";
import { useAuth } from "../context/AuthContext";

// Fallback seed centers in case API is offline
const DEFAULT_CENTERS = [
  { id: "CP-001", name: "Rajajinagar Dry Waste Collection Centre", lat: 12.9916, lon: 77.5551, type: "DWCC", accepts: "PET, HDPE, PP, Glass", address: "1st Block, Rajajinagar, Bengaluru" },
  { id: "CP-002", name: "Malleshwaram Dry Waste Collection Centre", lat: 13.0035, lon: 77.5709, type: "DWCC", accepts: "PET, HDPE, PP, Glass, Aluminium", address: "8th Cross, Malleshwaram, Bengaluru" },
  { id: "CP-003", name: "Indiranagar Reverse Vending Machine", lat: 12.9719, lon: 77.6412, type: "RVM", accepts: "PET, Aluminium", address: "100 Feet Road, Indiranagar, Bengaluru" },
  { id: "CP-004", name: "Koramangala Brand Takeback Kiosk", lat: 12.9352, lon: 77.6245, type: "Brand Takeback", accepts: "PET, Multilayer, HDPE", address: "5th Block, Koramangala, Bengaluru" },
  { id: "CP-005", name: "Jayanagar Dry Waste Collection Centre", lat: 12.9250, lon: 77.5938, type: "DWCC", accepts: "PET, HDPE, PP, Glass", address: "4th Block, Jayanagar, Bengaluru" },
  { id: "CP-006", name: "HSR Layout Recycling Centre", lat: 12.9116, lon: 77.6474, type: "Recycling Center", accepts: "PET, HDPE, PP, Aluminium, Glass", address: "Sector 1, HSR Layout, Bengaluru" },
  { id: "CP-007", name: "Whitefield Recycling Centre", lat: 12.9698, lon: 77.7500, type: "Recycling Center", accepts: "PET, HDPE, PP, Aluminium", address: "ITPL Main Road, Whitefield, Bengaluru" },
  { id: "CP-008", name: "Basaveshwaranagar Scrap Dealer", lat: 12.9899, lon: 77.5384, type: "Kabadiwala", accepts: "PET, HDPE, Paper, Aluminium", address: "Basaveshwaranagar, Bengaluru" },
  { id: "CP-009", name: "Shivajinagar Dry Waste Collection Centre", lat: 12.9857, lon: 77.6057, type: "DWCC", accepts: "PET, HDPE, PP, Paper", address: "Russell Market Area, Shivajinagar, Bengaluru" },
  { id: "CP-010", name: "Hebbal Dry Waste Collection Centre", lat: 13.0358, lon: 77.5970, type: "DWCC", accepts: "PET, HDPE, PP, Glass", address: "Near Hebbal Flyover, Bengaluru" },
  { id: "CP-011", name: "Banashankari Brand Takeback Kiosk", lat: 12.9255, lon: 77.5468, type: "Brand Takeback", accepts: "PET, HDPE, Multilayer", address: "2nd Stage, Banashankari, Bengaluru" },
  { id: "CP-012", name: "Vijayanagar Scrap Dealer", lat: 12.9719, lon: 77.5341, type: "Kabadiwala", accepts: "PET, HDPE, Aluminium", address: "RPC Layout, Vijayanagar, Bengaluru" },
];

export default function ConsumerView({
  apiUrl,
  activeSubTab = "scan",
  setActiveSubTab,
  onSwitchToAgent,
  demoGtin = "8909990000019",
}) {
  const { userId, user, isAuthenticated, setWalletBalance } = useAuth();
  const [subTab, setSubTab] = useState(activeSubTab);
  const [gtin, setGtin] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [productResult, setProductResult] = useState(null);
  const [searchError, setSearchError] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  // Simulated purchase state
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [activeQrModalPkg, setActiveQrModalPkg] = useState(null);

  // User financial state
  const [walletData, setWalletData] = useState(null);
  const [userPackagings, setUserPackagings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [walletLoading, setWalletLoading] = useState(false);

  // Collection Centers & Geolocation
  const [collectionPoints, setCollectionPoints] = useState(DEFAULT_CENTERS);
  const [selectedCenterId, setSelectedCenterId] = useState("CP-001");
  const [centerSearchQuery, setCenterSearchQuery] = useState("");
  const [centerFilterType, setCenterFilterType] = useState("ALL");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // User GPS Location
  const [userCoords, setUserCoords] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");

  // Map Modal
  const [activeMapCenter, setActiveMapCenter] = useState(null);

  // Voucher and Payout states
  const [voucherBrand, setVoucherBrand] = useState("Amazon Pay");
  const [voucherAmount, setVoucherAmount] = useState(10);
  const [voucherIssuing, setVoucherIssuing] = useState(false);
  const [redeemLoadingCode, setRedeemLoadingCode] = useState(null);
  const [redeemFeedback, setRedeemFeedback] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  // Direct Cashout / UPI Withdrawal state
  const [showCashoutModal, setShowCashoutModal] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState("UPI"); // "UPI" | "BANK_TRANSFER"
  const [payoutTarget, setPayoutTarget] = useState("");
  const [payoutAccountName, setPayoutAccountName] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutReceipt, setPayoutReceipt] = useState(null);
  const [payoutError, setPayoutError] = useState("");

  // Manual register product modal
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regBrand, setRegBrand] = useState("");
  const [regName, setRegName] = useState("");
  const [regMaterial, setRegMaterial] = useState("PET");

  // Ledger Filter
  const [ledgerFilter, setLedgerFilter] = useState("ALL"); // "ALL" | "REFUND" | "DEPOSIT_PAID" | "CASH_WITHDRAWAL" | "VOUCHER"

  useEffect(() => {
    setSubTab(activeSubTab);
  }, [activeSubTab]);

  const handleSubTabChange = (t) => {
    setSubTab(t);
    if (setActiveSubTab) setActiveSubTab(t);
  };

  // Fetch all collection points from backend
  useEffect(() => {
    async function fetchPoints() {
      try {
        const res = await fetch(`${apiUrl}/api/collection-points`);
        if (res.ok) {
          const data = await res.json();
          if (data.collection_points && data.collection_points.length > 0) {
            setCollectionPoints(data.collection_points);
            setSelectedCenterId(data.collection_points[0].id);
          }
        }
      } catch (_) {
        // Fallback already pre-seeded
      }
    }
    fetchPoints();
  }, [apiUrl]);

  // Request user Geolocation on mount
  useEffect(() => {
    setGpsLoading(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserCoords(coords);
          setGpsLoading(false);
        },
        () => {
          // Standard Bengaluru reference coords
          setUserCoords({ lat: 12.9797, lng: 77.5907 });
          setGpsError("Location permission not granted. Distances estimated from central Bengaluru.");
          setGpsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setUserCoords({ lat: 12.9797, lng: 77.5907 });
      setGpsError("Geolocation unavailable. Showing estimated distances from central Bengaluru.");
      setGpsLoading(false);
    }
  }, []);

  // Compute centers augmented with live distance and sorted
  const enrichedCenters = useMemo(() => {
    return collectionPoints.map((cp) => {
      const cLat = cp.lat ?? cp.coords?.lat ?? 12.9716;
      const cLng = cp.lon ?? cp.lng ?? cp.coords?.lng ?? 77.5946;
      let dist = 2.5;
      let durationMin = 10;

      if (userCoords) {
        dist = calculateHaversineDistance(userCoords.lat, userCoords.lng, cLat, cLng);
        durationMin = Math.max(2, Math.round((dist / 22) * 60));
      }

      return {
        ...cp,
        lat: cLat,
        lon: cLng,
        distanceKm: dist,
        durationMin,
      };
    }).sort((a, b) => a.distanceKm - b.distanceKm);
  }, [collectionPoints, userCoords]);

  // Currently selected center object
  const currentCenter = useMemo(() => {
    return enrichedCenters.find((c) => c.id === selectedCenterId) || enrichedCenters[0];
  }, [enrichedCenters, selectedCenterId]);

  // Filtered centers for the dropdown search
  const filteredCenters = useMemo(() => {
    return enrichedCenters.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(centerSearchQuery.toLowerCase()) ||
        (c.address && c.address.toLowerCase().includes(centerSearchQuery.toLowerCase())) ||
        (c.type && c.type.toLowerCase().includes(centerSearchQuery.toLowerCase()));

      const matchesType =
        centerFilterType === "ALL" ||
        (centerFilterType === "DWCC" && (c.type === "DWCC" || c.name.includes("Dry Waste"))) ||
        (centerFilterType === "RVM" && (c.type === "RVM" || c.name.includes("Vending"))) ||
        (centerFilterType === "BRAND" && (c.type === "Brand Takeback" || c.name.includes("Brand"))) ||
        (centerFilterType === "SCRAP" && (c.type === "Kabadiwala" || c.name.includes("Scrap")));

      return matchesSearch && matchesType;
    });
  }, [enrichedCenters, centerSearchQuery, centerFilterType]);

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
        if (w.wallet?.balance_inr !== undefined && setWalletBalance) {
          setWalletBalance(w.wallet.balance_inr);
        }
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
  }, [apiUrl, userId]);

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

      confetti({
        particleCount: 65,
        spread: 55,
        origin: { y: 0.6 },
        colors: ["#10b981", "#34d399", "#059669"],
      });

      fetchUserData();
      setActiveQrModalPkg(data.packaging);
    } catch (err) {
      alert(`Simulation error: ${err.message}`);
    } finally {
      setPurchaseLoading(false);
    }
  }

  // Issue brand voucher from wallet balance
  async function handleIssueVoucher() {
    setVoucherIssuing(true);
    try {
      const res = await fetch(`${apiUrl}/api/vouchers/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          amount: parseFloat(voucherAmount),
          provider: voucherBrand,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Unable to issue voucher.");
      }

      confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
      fetchUserData();
      setRedeemFeedback({
        success: true,
        message: `Successfully generated ${voucherBrand} voucher for ₹${voucherAmount}! Code: ${data.voucher.voucher_code}`,
      });
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

  // Handle direct cashout / UPI payout
  async function handleDisburseCashout(e) {
    e.preventDefault();
    setPayoutError("");
    const amt = parseFloat(payoutAmount);
    const available = walletData?.wallet?.balance_inr || 0;

    if (!amt || amt <= 0) {
      setPayoutError("Please enter a valid payout amount.");
      return;
    }
    if (amt > available) {
      setPayoutError(`Amount exceeds available balance (₹${available.toFixed(2)}).`);
      return;
    }
    if (!payoutTarget.trim()) {
      setPayoutError(payoutMethod === "UPI" ? "Please enter a valid UPI ID." : "Please enter Bank Account & IFSC.");
      return;
    }

    setPayoutLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/wallet/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          amount: amt,
          payout_method: payoutMethod,
          payout_target: payoutTarget.trim(),
          account_name: payoutAccountName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Withdrawal failed.");
      }

      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 },
        colors: ["#10b981", "#3b82f6", "#047857"],
      });

      setPayoutReceipt(data);
      fetchUserData();
    } catch (err) {
      setPayoutError(err.message || "Failed to process disbursement.");
    } finally {
      setPayoutLoading(false);
    }
  }

  // Copy code helper
  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Manual register product
  async function handleRegisterProduct(e) {
    e.preventDefault();
    try {
      const gtinCode = productResult?.gtin || gtin;
      const res = await fetch(`${apiUrl}/api/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gtin: gtinCode,
          brand: regBrand,
          product: regName,
          material: regMaterial,
          category: "Beverage",
          weight_g: 22.0,
          layers: "mono",
          epr_category: "Cat I",
          recyclability_pct: 90.0,
        }),
      });

      if (res.ok) {
        setShowRegisterModal(false);
        handleLookup(gtinCode);
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to save product");
      }
    } catch (_) {
      alert("Error contacting server");
    }
  }

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    if (ledgerFilter === "ALL") return transactions;
    if (ledgerFilter === "REFUND") return transactions.filter((t) => t.type === "REFUND" || t.type === "CREDIT");
    if (ledgerFilter === "DEPOSIT_PAID") return transactions.filter((t) => t.type === "DEPOSIT_PAID");
    if (ledgerFilter === "CASH_WITHDRAWAL") return transactions.filter((t) => t.type === "CASH_WITHDRAWAL");
    if (ledgerFilter === "VOUCHER") return transactions.filter((t) => t.type.includes("VOUCHER"));
    return transactions;
  }, [transactions, ledgerFilter]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Sub-navigation tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1 border border-slate-200/80">
          <button
            onClick={() => handleSubTabChange("scan")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              subTab === "scan"
                ? "bg-white text-emerald-950 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Camera size={15} className="text-emerald-700" />
            <span>Scan &amp; Verify</span>
          </button>

          <button
            onClick={() => handleSubTabChange("centers")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              subTab === "centers"
                ? "bg-white text-emerald-950 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <MapPin size={15} className="text-emerald-700" />
            <span>Drop-off Centers ({enrichedCenters.length})</span>
          </button>

          <button
            onClick={() => handleSubTabChange("packagings")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              subTab === "packagings"
                ? "bg-white text-emerald-950 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Package size={15} className="text-emerald-700" />
            <span>My Passports ({userPackagings.length})</span>
          </button>

          <button
            onClick={() => handleSubTabChange("wallet")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              subTab === "wallet"
                ? "bg-white text-emerald-950 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Wallet size={15} className="text-emerald-700" />
            <span>Wallet &amp; Redeem</span>
            {walletData?.wallet?.balance_inr > 0 && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.2 text-[10px] font-extrabold text-emerald-800">
                ₹{walletData.wallet.balance_inr.toFixed(0)}
              </span>
            )}
          </button>
        </div>

        {/* Live Wallet Quick Summary Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-white px-3.5 py-1.5 shadow-xs">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
              ₹
            </div>
            <div>
              <div className="text-[10px] font-semibold text-slate-500 uppercase">Available Cashback</div>
              <div className="text-sm font-extrabold text-slate-900 font-mono">
                ₹{walletData?.wallet?.balance_inr?.toFixed(2) || "0.00"}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              handleSubTabChange("wallet");
              setShowCashoutModal(true);
            }}
            className="hidden sm:flex items-center gap-1.5 rounded-xl bg-[#064e3b] px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#085a44] transition active:scale-95"
          >
            <Send size={13} />
            <span>Redeem Money</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. SCAN & VERIFY TAB */}
      {/* ======================================================== */}
      {subTab === "scan" && (
        <div className="mt-6 space-y-6">
          {/* Barcode Search Header Card */}
          <div className="rounded-3xl border border-[#dce7df] bg-white p-6 sm:p-8 shadow-sm">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">
                <ShieldCheck size={14} className="text-emerald-700" />
                GS1 GTIN &amp; EPR Deposit Intelligence
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-2">
                Scan Real Barcodes to Reveal Refundable Deposits
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                Enter an Indian retail barcode (EAN-13 / GTIN) or scan using your camera. Every compliant container anchors a verifiable deposit refund upon physical return.
              </p>
            </div>

            {/* Input Bar */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                  <Search size={18} />
                </div>
                <input
                  type="text"
                  value={gtin}
                  onChange={(e) => setGtin(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                  placeholder="Enter 13-digit GTIN (e.g. 8901030000000 or 8909990000019)"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30 font-mono transition"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleLookup()}
                  disabled={searchLoading}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-2xl bg-[#064e3b] px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-[#085a44] transition active:scale-[0.98] disabled:opacity-50"
                >
                  {searchLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Resolving...
                    </>
                  ) : (
                    <>
                      <Search size={16} />
                      Verify Deposit
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowScanner(true)}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-100 transition active:scale-[0.98]"
                  title="Open live camera barcode scanner"
                >
                  <Camera size={18} className="text-emerald-700" />
                  <span className="hidden sm:inline">Camera</span>
                </button>
              </div>
            </div>

            {/* Demo Barcodes Quick Bar */}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Quick Demo Barcodes:</span>
              {[
                { label: "Kinley 500ml (PET)", code: "8909990000019" },
                { label: "Diet Coke (Can)", code: "8901030000000" },
                { label: "Tata Tea Gold (Pouch)", code: "8901058852328" },
                { label: "Amul Taaza (Tetra)", code: "8901262010054" },
              ].map((item) => (
                <button
                  key={item.code}
                  onClick={() => {
                    setGtin(item.code);
                    handleLookup(item.code);
                  }}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:border-emerald-500 hover:bg-emerald-50/50 hover:text-emerald-900 transition"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {searchError && (
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-red-600" />
                  <span>{searchError}</span>
                </div>
                <button
                  onClick={() => {
                    setRegBrand("");
                    setRegName("");
                    setShowRegisterModal(true);
                  }}
                  className="rounded-lg bg-red-100 px-3 py-1 font-bold text-red-900 hover:bg-red-200 transition"
                >
                  Add to Catalog
                </button>
              </div>
            )}
          </div>

          {/* Product Lookup Result Section */}
          {productResult && !productResult.notFound && (
            <div className="rounded-3xl border border-[#dce7df] bg-white p-6 sm:p-8 shadow-sm space-y-6">
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
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
                    {productResult.product?.brand} {productResult.product?.product}
                  </h2>
                  <div className="text-xs text-slate-500 mt-1">
                    GTIN: <span className="font-mono font-bold text-slate-700">{productResult.product?.gtin}</span> &middot; Category: {productResult.product?.category}
                  </div>
                </div>

                {/* Deposit Highlight Card */}
                <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 text-right min-w-[200px] shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                    Refundable Deposit
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
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                    <Package size={15} className="text-emerald-700" />
                    Packaging Material
                  </span>
                  <div className="text-lg font-bold text-slate-900 mt-1">{productResult.product?.material}</div>
                  <div className="text-xs text-slate-500">{productResult.product?.weight_g}g ({productResult.product?.layers || "mono-layer"})</div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                    <Recycle size={15} className="text-emerald-700" />
                    Recyclability &amp; EPR
                  </span>
                  <div className="text-lg font-bold text-slate-900 mt-1">
                    {productResult.epr?.recyclability_pct || "85"}%
                  </div>
                  <div className="text-xs text-slate-500">{productResult.epr?.category || "Cat I Rigid"}</div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                    <Leaf size={15} className="text-emerald-700" />
                    CO₂e Footprint
                  </span>
                  <div className="text-lg font-bold text-slate-900 mt-1">
                    {Math.round((productResult.environment?.co2e_kg || 0.065) * 1000)}g
                  </div>
                  <div className="text-xs text-slate-500">Material lifecycle impact</div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                    <Gift size={15} className="text-emerald-700" />
                    Refund Method
                  </span>
                  <div className="text-lg font-bold text-slate-900 mt-1">
                    UPI / Voucher
                  </div>
                  <div className="text-xs text-slate-500">Instant on agent verification</div>
                </div>
              </div>

              {/* Action Banner: Simulate Purchase & Generate Return Pass */}
              <div className="rounded-3xl border border-emerald-900/10 bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 p-6 text-white shadow-lg">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 border border-emerald-500/30">
                        Interactive Step 1: Simulate Purchase
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white mt-1.5">
                      Purchase Item &amp; Secure Return Token
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                      Simulate buying this product (retail price ₹20.00 + refundable deposit ₹{productResult.pfand_deposit?.deposit_inr?.toFixed(2) || "5.00"}). This locks the deposit into your ledger and creates a tamper-proof digital Return Pass QR.
                    </p>
                  </div>

                  <button
                    onClick={handleSimulatePurchase}
                    disabled={purchaseLoading}
                    className="flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-300 px-6 py-4 text-sm font-extrabold text-emerald-950 shadow-lg shadow-emerald-500/20 hover:from-emerald-300 hover:to-teal-200 transition active:scale-[0.98] disabled:opacity-50"
                  >
                    {purchaseLoading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Generating Pass...
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

              {/* Nearest Drop-off Center Preview Card */}
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
                    <MapPin size={15} className="text-emerald-700" />
                    <span>Nearest Authorized Intake Center</span>
                  </div>
                  <button
                    onClick={() => handleSubTabChange("centers")}
                    className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1"
                  >
                    Browse all {enrichedCenters.length} centres
                    <ChevronRight size={13} />
                  </button>
                </div>

                <div className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {productResult?.dropoff?.name || currentCenter.name}
                        </span>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          {productResult?.dropoff?.type || currentCenter.type || "BBMP DWCC"}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-1">
                        <span className="font-semibold text-emerald-800">BBMP Solid Waste Management (SWM)</span>
                        <span>&middot;</span>
                        <span>{productResult?.dropoff?.address || currentCenter.address || "Bengaluru Ward Intake Point"}</span>
                      </div>

                      {/* Clean Material Badges — Formatted without raw pipes or slashes */}
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                          Accepts:
                        </span>
                        {(() => {
                          const raw = productResult?.dropoff?.accepts || currentCenter.accepts || "PET, Aluminium, Glass";
                          const cleaned = String(raw)
                            .replace(/Paper\/Cardboard/gi, "Paper & Cardboard")
                            .replace(/plastic-plastic/gi, "Rigid Plastics")
                            .replace(/plastic \+ non-plastic/gi, "Composite Multilayer")
                            .split(/[|,]/)
                            .map((s) => s.trim())
                            .filter(Boolean);
                          return cleaned.map((mat, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center rounded-lg bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-900 shadow-2xs"
                            >
                              {mat}
                            </span>
                          ));
                        })()}
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-xl font-extrabold text-emerald-800 font-mono">
                          {currentCenter.distanceKm.toFixed(1)} km
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {userCoords ? "From your location" : "Bengaluru Central"}
                        </div>
                      </div>

                      <div className="h-9 w-px bg-slate-200" />

                      <div className="text-center">
                        <div className="text-xl font-extrabold text-slate-700 font-mono">
                          ~{currentCenter.durationMin} min
                        </div>
                        <div className="text-[10px] text-slate-500">Drive time</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex gap-3 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => setActiveMapCenter(currentCenter)}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#064e3b] py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#085a44] transition active:scale-[0.98]"
                    >
                      <Map size={14} />
                      View Interactive Map &amp; Route
                    </button>
                    <button
                      onClick={() => {
                        const url = `https://www.google.com/maps/dir/?api=1&destination=${currentCenter.lat},${currentCenter.lon}&travelmode=driving`;
                        window.open(url, "_blank");
                      }}
                      className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                    >
                      <Navigation size={14} />
                      Directions
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. DROP-OFF CENTRES DIRECTORY TAB (Requirement 2 & 3) */}
      {/* ======================================================== */}
      {subTab === "centers" && (
        <div className="mt-6 space-y-6">
          {/* Header Banner */}
          <div className="rounded-3xl border border-[#dce7df] bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">
                  <Compass size={14} className="text-emerald-700" />
                  Live Geolocation Distance Engine
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
                  Find Nearest Authorized Drop-off Centres
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  Real distances calculated from your current GPS position via the Haversine formula. Present your Return Token QR at any of these verified intake points to authorize instant cashback.
                </p>
              </div>

              {/* Open Map for All Centers Button */}
              <button
                onClick={() => setActiveMapCenter(currentCenter)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-[#064e3b] px-5 py-3.5 text-xs font-bold text-white shadow-md hover:bg-[#085a44] transition shrink-0 active:scale-95"
              >
                <Map size={16} />
                <span>Open Full Interactive Map</span>
              </button>
            </div>

            {/* Search and Filters Bar */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  value={centerSearchQuery}
                  onChange={(e) => setCenterSearchQuery(e.target.value)}
                  placeholder="Search by center name, locality (e.g. Indiranagar, Malleshwaram, Koramangala)..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30 transition"
                />
              </div>

              {/* Type Filter Chips */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1 rounded-2xl border border-slate-200">
                {[
                  { id: "ALL", label: "All Facilities" },
                  { id: "DWCC", label: "BBMP DWCC" },
                  { id: "RVM", label: "Smart RVM" },
                  { id: "BRAND", label: "Brand Takeback" },
                  { id: "SCRAP", label: "Scrap Dealer" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setCenterFilterType(f.id)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      centerFilterType === f.id
                        ? "bg-[#064e3b] text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {gpsError && (
              <div className="mt-3 text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex items-center gap-2">
                <Info size={14} className="shrink-0 text-amber-600" />
                <span>{gpsError}</span>
              </div>
            )}
          </div>

          {/* Grid of Drop-Off Centres */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCenters.map((cp) => {
              const isSelected = cp.id === selectedCenterId;
              let badgeColor = "bg-emerald-100 text-emerald-900 border-emerald-300";
              if (cp.type === "RVM") badgeColor = "bg-blue-100 text-blue-900 border-blue-300";
              if (cp.type === "Brand Takeback") badgeColor = "bg-purple-100 text-purple-900 border-purple-300";
              if (cp.type === "Kabadiwala") badgeColor = "bg-amber-100 text-amber-900 border-amber-300";

              return (
                <div
                  key={cp.id}
                  onClick={() => setSelectedCenterId(cp.id)}
                  className={`rounded-3xl border bg-white p-5 transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "border-emerald-600 shadow-md ring-2 ring-emerald-500/20"
                      : "border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-sm"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase border ${badgeColor}`}>
                        {cp.type}
                      </span>
                      <div className="text-right">
                        <span className="text-base font-extrabold text-emerald-800 font-mono">
                          {cp.distanceKm.toFixed(1)} km
                        </span>
                        <div className="text-[10px] text-slate-400">~{cp.durationMin} min drive</div>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 mt-2.5 leading-snug">
                      {cp.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {cp.address || "Authorized Bengaluru Center"}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {String(cp.accepts || "PET, Aluminium, Glass")
                        .replace(/Paper\/Cardboard/gi, "Paper & Cardboard")
                        .replace(/plastic-plastic/gi, "Rigid Plastics")
                        .replace(/plastic \+ non-plastic/gi, "Composite Multilayer")
                        .split(/[|,]/)
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .map((mat, i) => (
                          <span
                            key={i}
                            className="rounded-md bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-900"
                          >
                            {mat}
                          </span>
                        ))}
                    </div>
                  </div>

                  {/* Actions for this card */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMapCenter(cp);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2 text-xs font-bold text-slate-700 hover:bg-[#064e3b] hover:text-white transition"
                    >
                      <Map size={13} />
                      <span>Interactive Map</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const url = `https://www.google.com/maps/dir/?api=1&destination=${cp.lat},${cp.lon}&travelmode=driving`;
                        window.open(url, "_blank");
                      }}
                      className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                      title="Open Turn-by-Turn Navigation in Google Maps"
                    >
                      <Navigation size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredCenters.length === 0 && (
            <div className="text-center py-12 rounded-3xl border border-dashed border-slate-200 bg-white p-6">
              <Building2 size={36} className="mx-auto text-slate-300 mb-2" />
              <div className="text-sm font-bold text-slate-800">No centers found matching criteria</div>
              <div className="text-xs text-slate-500 mt-1">Try relaxing your search terms or filter tags.</div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. MY PASSPORTS TAB */}
      {/* ======================================================== */}
      {subTab === "packagings" && (
        <div className="mt-6 space-y-6">
          <div className="rounded-3xl border border-[#dce7df] bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">
                  <ShieldCheck size={14} className="text-emerald-700" />
                  Tamper-proof Digital Packaging Passports
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
                  My Active Packaging Instances &amp; Return QR Codes
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  Every product scanned and purchased produces a unique token. Present this token at any authorized intake center to claim your instant refund.
                </p>
              </div>

              <button
                onClick={() => handleSubTabChange("scan")}
                className="flex items-center justify-center gap-2 rounded-2xl bg-[#064e3b] px-5 py-3 text-xs font-bold text-white shadow-sm hover:bg-[#085a44] transition shrink-0"
              >
                <PlusCircle size={15} />
                <span>Simulate Another Purchase</span>
              </button>
            </div>
          </div>

          {/* List of User's Packaging Passports */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {userPackagings.length === 0 ? (
              <div className="col-span-full py-16 text-center rounded-3xl border border-dashed border-slate-200 bg-white p-8">
                <Package size={40} className="mx-auto text-slate-300 mb-3" />
                <h3 className="text-base font-bold text-slate-800">No Packaging Tokens Yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Scan any product barcode in the Scan tab and click "Simulate Purchase" to generate your first verified return pass!
                </p>
                <button
                  onClick={() => handleSubTabChange("scan")}
                  className="mt-4 rounded-xl bg-[#064e3b] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#085a44] transition"
                >
                  Go to Scan Tab
                </button>
              </div>
            ) : (
              userPackagings.map((pkg) => {
                const isReturned = pkg.status === "returned";
                return (
                  <div
                    key={pkg.id}
                    className={`rounded-3xl border bg-white p-5 shadow-xs transition ${
                      isReturned
                        ? "border-slate-200 opacity-80"
                        : "border-emerald-200 hover:border-emerald-400"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                          isReturned
                            ? "bg-slate-100 text-slate-600"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {isReturned ? "Returned & Refunded" : "Active Return Pass"}
                      </span>
                      <div className="text-right">
                        <span className="text-lg font-extrabold text-emerald-800 font-mono">
                          ₹{pkg.deposit_inr?.toFixed(2)}
                        </span>
                        <div className="text-[10px] text-slate-400">Refund value</div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">
                        {pkg.brand} {pkg.product_name}
                      </h4>
                      <div className="text-xs text-slate-500 mt-1">
                        GTIN: <span className="font-mono">{pkg.gtin}</span> &middot; {pkg.material}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Token: <span className="font-mono font-bold text-slate-700">{pkg.public_token}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      {!isReturned ? (
                        <>
                          <button
                            onClick={() => setActiveQrModalPkg(pkg)}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#064e3b] py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#085a44] transition"
                          >
                            <QrCode size={14} />
                            <span>Show Return QR</span>
                          </button>
                          <button
                            onClick={() => onSwitchToAgent(pkg.public_token)}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                            title="Verify directly in collection agent mode"
                          >
                            <ChevronRight size={15} />
                          </button>
                        </>
                      ) : (
                        <div className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                          <CheckCircle2 size={14} />
                          <span>Disbursed at {pkg.collection_point_name || "Intake Center"}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. WALLET & REDEMPTION SYSTEM TAB (Requirement 4) */}
      {/* ======================================================== */}
      {subTab === "wallet" && (
        <div className="mt-6 space-y-6">
          {/* Top Financial Dashboard Overview */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-900 via-teal-950 to-slate-950 p-6 text-white shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                  Available Redeemable Balance
                </span>
                <Wallet size={20} className="text-emerald-400" />
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-white mt-2 font-mono">
                ₹{walletData?.wallet?.balance_inr?.toFixed(2) || "0.00"}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => setShowCashoutModal(true)}
                  className="rounded-xl bg-gradient-to-r from-emerald-400 to-teal-300 px-3.5 py-1.5 text-xs font-extrabold text-emerald-950 shadow-xs hover:from-emerald-300 hover:to-teal-200 transition active:scale-95"
                >
                  Redeem via UPI
                </button>
                <span className="text-[10px] text-emerald-300/80">Instant payout</span>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Deposits Currently Held
              </span>
              <div className="text-3xl font-extrabold text-slate-900 mt-2 font-mono">
                ₹{walletData?.wallet?.deposits_held_inr?.toFixed(2) || "0.00"}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                Locked across {walletData?.active_packagings_count || 0} active containers
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Lifetime Refunds
              </span>
              <div className="text-3xl font-extrabold text-emerald-800 mt-2 font-mono">
                ₹{walletData?.wallet?.total_refunded_inr?.toFixed(2) || "0.00"}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                Across {walletData?.returned_packagings_count || 0} returned packages
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Single-Use Vouchers
              </span>
              <div className="text-3xl font-extrabold text-slate-900 mt-2 font-mono">
                {walletData?.vouchers?.length || 0}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                {walletData?.vouchers?.filter((v) => v.status === "issued").length || 0} active / {walletData?.vouchers?.filter((v) => v.status === "redeemed").length || 0} redeemed
              </div>
            </div>
          </div>

          {/* Feedback banner */}
          {redeemFeedback && (
            <div
              className={`rounded-2xl p-4 text-xs font-medium border flex items-center justify-between gap-2 shadow-xs ${
                redeemFeedback.success
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-red-200 bg-red-50 text-red-900"
              }`}
            >
              <div className="flex items-center gap-2">
                {redeemFeedback.success ? <CheckCircle2 size={16} className="text-emerald-700" /> : <AlertCircle size={16} className="text-red-700" />}
                <span>{redeemFeedback.message}</span>
              </div>
              <button
                onClick={() => setRedeemFeedback(null)}
                className="text-xs font-bold hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Two-Column Redemption Hub */}
          <div className="grid gap-6 md:grid-cols-12">
            {/* Left Column: Direct UPI / Bank Payout Card */}
            <div className="md:col-span-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                  <Send size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Instant UPI &amp; Bank Transfer</h3>
                  <p className="text-xs text-slate-500">Disburse money directly to Google Pay, PhonePe, Paytm, or IMPS</p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setPayoutMethod("UPI")}
                    className={`flex-1 py-2 text-center rounded-lg transition ${
                      payoutMethod === "UPI" ? "bg-white text-emerald-950 shadow-xs" : "text-slate-600"
                    }`}
                  >
                    UPI ID (VPA)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutMethod("BANK_TRANSFER")}
                    className={`flex-1 py-2 text-center rounded-lg transition ${
                      payoutMethod === "BANK_TRANSFER" ? "bg-white text-emerald-950 shadow-xs" : "text-slate-600"
                    }`}
                  >
                    Bank Account (IMPS)
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {payoutMethod === "UPI" ? "Recipient UPI ID / Virtual Address *" : "Account Number & IFSC Code *"}
                  </label>
                  <input
                    type="text"
                    value={payoutTarget}
                    onChange={(e) => setPayoutTarget(e.target.value)}
                    placeholder={payoutMethod === "UPI" ? "e.g. mobile@upi or yourname@okhdfcbank" : "A/C: 1234567890, IFSC: HDFC0000123"}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30 transition font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Account Holder Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={payoutAccountName}
                    onChange={(e) => setPayoutAccountName(e.target.value)}
                    placeholder={user?.name || "e.g. Aarav Sharma"}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30 transition"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">Withdrawal Amount (₹) *</label>
                    <span className="text-[11px] text-slate-500">
                      Available: <span className="font-bold text-emerald-800">₹{walletData?.wallet?.balance_inr?.toFixed(2) || "0.00"}</span>
                    </span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max={walletData?.wallet?.balance_inr || 0}
                    step="1"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder="Enter amount (e.g. 10)"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30 font-mono transition"
                  />

                  {/* Quick Preset Buttons */}
                  <div className="mt-2 flex gap-2">
                    {[5, 10, 25].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setPayoutAmount(String(preset))}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                      >
                        ₹{preset}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPayoutAmount(String(walletData?.wallet?.balance_inr || 0))}
                      className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-900 hover:bg-emerald-100"
                    >
                      Max (All)
                    </button>
                  </div>
                </div>

                {payoutError && (
                  <div className="text-xs text-red-700 bg-red-50 p-2.5 rounded-xl border border-red-200">
                    {payoutError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleDisburseCashout}
                  disabled={payoutLoading || (walletData?.wallet?.balance_inr || 0) <= 0}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#064e3b] py-3.5 text-xs font-bold text-white shadow-md hover:bg-[#085a44] transition active:scale-[0.98] disabled:opacity-40"
                >
                  {payoutLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Processing Bank Transfer...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Withdraw ₹{parseFloat(payoutAmount || "0").toFixed(2)} to {payoutMethod}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Column: Convert to Brand Vouchers Card */}
            <div className="md:col-span-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-100 text-teal-800">
                  <Gift size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Brand Digital Gift Vouchers</h3>
                  <p className="text-xs text-slate-500">Convert cashback balance into popular e-gift vouchers</p>
                </div>
              </div>

              {/* Brand Selector */}
              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Partner Brand</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { name: "Amazon Pay", desc: "Shopping & Utility" },
                      { name: "Flipkart", desc: "E-Commerce" },
                      { name: "Swiggy", desc: "Food & Instamart" },
                      { name: "Zomato", desc: "Dining & Delivery" },
                      { name: "Decathlon", desc: "Eco Sports Gear" },
                      { name: "Croma", desc: "Electronics" },
                    ].map((brand) => (
                      <button
                        key={brand.name}
                        type="button"
                        onClick={() => setVoucherBrand(brand.name)}
                        className={`rounded-xl p-2.5 text-left border transition ${
                          voucherBrand === brand.name
                            ? "border-emerald-600 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-500"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="text-xs font-bold text-slate-900">{brand.name}</div>
                        <div className="text-[10px] text-slate-500 truncate">{brand.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Denomination</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[5, 10, 20, 50].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setVoucherAmount(amt)}
                        className={`rounded-xl py-2.5 text-center text-xs font-bold border transition ${
                          voucherAmount === amt
                            ? "border-emerald-700 bg-emerald-100 text-emerald-950 shadow-xs"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        ₹{amt}.00
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
                  You are converting <strong className="text-slate-900">₹{voucherAmount}.00</strong> from your balance into an instant <strong className="text-emerald-900">{voucherBrand}</strong> gift card code.
                </div>

                <button
                  type="button"
                  onClick={handleIssueVoucher}
                  disabled={voucherIssuing || (walletData?.wallet?.balance_inr || 0) < voucherAmount}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#064e3b] py-3.5 text-xs font-bold text-white shadow-md hover:bg-[#085a44] transition active:scale-[0.98] disabled:opacity-40"
                >
                  {voucherIssuing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Issuing Code...
                    </>
                  ) : (
                    <>
                      <Gift size={16} />
                      Generate {voucherBrand} Voucher (₹{voucherAmount})
                    </>
                  )}
                </button>

                {(walletData?.wallet?.balance_inr || 0) < voucherAmount && (
                  <div className="text-[11px] text-amber-700 text-center">
                    Requires ₹{voucherAmount}.00 (Current balance: ₹{walletData?.wallet?.balance_inr?.toFixed(2) || "0.00"})
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Vouchers Inventory & Single-Use Redemption */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">My Issued Vouchers</h3>
                <p className="text-xs text-slate-500">
                  Each voucher has a single-use server verified code. Copy to use or click "Redeem Now" to apply credit.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500">
                {walletData?.vouchers?.length || 0} Total Vouchers
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-h-[360px] overflow-y-auto pr-1">
              {!walletData?.vouchers || walletData.vouchers.length === 0 ? (
                <div className="col-span-full py-10 text-center text-slate-400 text-xs">
                  No vouchers generated yet. Issue a brand voucher above or select voucher on physical return.
                </div>
              ) : (
                walletData.vouchers.map((vch) => {
                  const isRedeemed = vch.status === "redeemed";
                  return (
                    <div
                      key={vch.voucher_id}
                      className={`rounded-2xl border p-4 transition ${
                        isRedeemed
                          ? "border-slate-200 bg-slate-50/70 opacity-75"
                          : "border-emerald-200 bg-emerald-50/40 shadow-xs hover:border-emerald-300"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-800">{vch.provider}</span>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Amount: <strong className="text-slate-900 font-mono font-bold">₹{vch.amount_inr?.toFixed(2)}</strong>
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                            isRedeemed ? "bg-slate-200 text-slate-600" : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {vch.status}
                        </span>
                      </div>

                      {/* Code Bar */}
                      <div className="mt-3 flex items-center justify-between rounded-xl bg-white border border-slate-200 px-3 py-2">
                        <span className="font-mono text-xs font-bold text-slate-900 tracking-wider">
                          {vch.voucher_code}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(vch.voucher_code)}
                          className="text-slate-400 hover:text-emerald-700 transition p-1"
                          title="Copy Code"
                        >
                          {copiedCode === vch.voucher_code ? (
                            <Check size={14} className="text-emerald-600" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-[11px]">
                        {!isRedeemed ? (
                          <button
                            type="button"
                            onClick={() => handleRedeemVoucher(vch.voucher_code)}
                            disabled={redeemLoadingCode === vch.voucher_code}
                            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#064e3b] py-2 text-xs font-bold text-white hover:bg-[#085a44] transition active:scale-95 disabled:opacity-50"
                          >
                            {redeemLoadingCode === vch.voucher_code ? "Verifying..." : "Redeem Now"}
                          </button>
                        ) : (
                          <div className="w-full text-center py-1 text-slate-400 font-medium">
                            Redeemed on {vch.redeemed_at ? new Date(vch.redeemed_at).toLocaleDateString() : "earlier"}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Immutable Transaction Ledger History Table */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Immutable Ledger Transaction Trail</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Every deposit payment, refund disbursement, and cashout is recorded with SHA cryptographic anchors.
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                {[
                  { id: "ALL", label: "All" },
                  { id: "REFUND", label: "Refunds" },
                  { id: "DEPOSIT_PAID", label: "Deposits" },
                  { id: "CASH_WITHDRAWAL", label: "Withdrawals" },
                  { id: "VOUCHER", label: "Vouchers" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setLedgerFilter(f.id)}
                    className={`rounded-lg px-2.5 py-1 transition ${
                      ledgerFilter === f.id
                        ? "bg-white text-emerald-950 font-bold shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
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
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No transactions recorded for this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => {
                      const isCredit = tx.type === "REFUND" || tx.type === "CREDIT";
                      return (
                        <tr key={tx.transaction_id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 font-mono text-[11px] text-slate-500">{tx.transaction_id}</td>
                          <td className="py-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                isCredit
                                  ? "bg-emerald-100 text-emerald-800"
                                  : tx.type === "CASH_WITHDRAWAL"
                                  ? "bg-blue-100 text-blue-800"
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
                          <td className={`py-3 text-right font-bold font-mono ${isCredit ? "text-emerald-700" : "text-slate-800"}`}>
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

      {/* ======================================================== */}
      {/* MODALS */}
      {/* ======================================================== */}

      {/* 1. Return QR Pass Modal */}
      {activeQrModalPkg && (
        <ReturnQrModal
          packaging={activeQrModalPkg}
          onClose={() => setActiveQrModalPkg(null)}
          onSwitchToAgent={() => onSwitchToAgent(activeQrModalPkg.public_token)}
        />
      )}

      {/* 2. Interactive Map Modal with Real Geolocation & Directions */}
      {activeMapCenter && (
        <DropoffMap
          dropoff={activeMapCenter}
          allCenters={enrichedCenters}
          onSelectCenter={(c) => setActiveMapCenter(c)}
          onClose={() => setActiveMapCenter(null)}
        />
      )}

      {/* 3. Camera Barcode Scanner Modal */}
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

      {/* 4. Instant Payout Receipt Modal */}
      {payoutReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100">
            <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 px-6 py-6 text-white text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 mb-2">
                <CheckCheck size={26} />
              </div>
              <h3 className="text-lg font-bold text-white">Disbursement Successful!</h3>
              <p className="text-xs text-emerald-300/80 mt-0.5">
                Funds transferred via {payoutReceipt.payout_method}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-center py-2">
                <div className="text-3xl font-extrabold text-slate-900 font-mono">
                  ₹{payoutReceipt.amount_inr?.toFixed(2)}
                </div>
                <div className="text-xs text-slate-500 mt-1">Disbursed to {payoutReceipt.payout_target}</div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">UTR / Ref Number:</span>
                  <span className="font-mono font-bold text-slate-900">{payoutReceipt.utr_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Transaction ID:</span>
                  <span className="font-mono text-slate-700">{payoutReceipt.reference_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Timestamp:</span>
                  <span className="text-slate-700">{new Date(payoutReceipt.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2">
                  <span className="text-slate-500">New Wallet Balance:</span>
                  <span className="font-bold text-emerald-800 font-mono">₹{payoutReceipt.new_balance_inr?.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPayoutReceipt(null)}
                className="w-full rounded-xl bg-[#064e3b] py-3 text-xs font-bold text-white hover:bg-[#085a44] transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Manual Product Catalog Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Register Product in Catalog</h3>
            <p className="text-xs text-slate-500 mt-1">
              Add packaging specifications for barcode <code className="font-mono font-bold text-emerald-900">{productResult?.gtin || gtin}</code>
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
                  <option value="PET">PET (Rigid Plastic)</option>
                  <option value="Aluminium">Aluminium (Can)</option>
                  <option value="Glass">Glass (Bottle)</option>
                  <option value="HDPE">HDPE (Flacons)</option>
                  <option value="Multilayer">Multilayer Pouch</option>
                </select>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#064e3b] py-2.5 font-bold text-white hover:bg-[#085a44]"
                >
                  Save &amp; Verify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
