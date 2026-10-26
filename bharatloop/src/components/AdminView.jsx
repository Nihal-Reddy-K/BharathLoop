import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Factory,
  Package,
  Settings,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Leaf,
  Layers,
  Search,
  PlusCircle,
  Save,
  Loader2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

export default function AdminView({ apiUrl }) {
  const [activeTab, setActiveTab] = useState("metrics");
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Deposit rules state
  const [rules, setRules] = useState([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [editDepositInr, setEditDepositInr] = useState(5);
  const [editActive, setEditActive] = useState(true);
  const [ruleSaveMessage, setRuleSaveMessage] = useState("");

  // Catalog state
  const [products, setProducts] = useState([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(false);

  // Manufacturer Analysis state (EPR & LCA)
  const [analyzeGtin, setAnalyzeGtin] = useState("8909990000019");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // Fetch metrics
  const fetchMetrics = async () => {
    setMetricsLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/admin/metrics`);
      if (res.ok) {
        const d = await res.json();
        setMetrics(d);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setMetricsLoading(false);
    }
  };

  // Fetch deposit rules
  const fetchRules = async () => {
    setRulesLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/deposit-rules`);
      if (res.ok) {
        const d = await res.json();
        setRules(d.rules || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRulesLoading(false);
    }
  };

  // Fetch catalog
  const fetchCatalog = async () => {
    setCatalogLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/products?limit=100`);
      if (res.ok) {
        const d = await res.json();
        setProducts(d.products || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCatalogLoading(false);
    }
  };

  // Run manufacturer EPR analysis
  const runAnalysis = async (code = analyzeGtin) => {
    setAnalysisLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/manufacturer/analyze/${code}`);
      if (res.ok) {
        const d = await res.json();
        setAnalysisResult(d);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAnalysisLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    fetchRules();
    fetchCatalog();
    runAnalysis();
  }, [apiUrl]);

  // Save updated deposit rule
  async function handleSaveRule(ruleId) {
    try {
      const res = await fetch(`${apiUrl}/api/deposit-rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rule_id: ruleId,
          deposit_inr: parseFloat(editDepositInr),
          active: editActive,
        }),
      });
      if (res.ok) {
        setRuleSaveMessage(`Rule ${ruleId} updated successfully.`);
        setEditingRuleId(null);
        fetchRules();
        setTimeout(() => setRuleSaveMessage(""), 3000);
      }
    } catch (e) {
      alert("Error saving rule");
    }
  }

  const filteredProducts = products.filter(
    (p) =>
      p.brand.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      p.product.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      p.gtin.includes(catalogSearch) ||
      p.material.toLowerCase().includes(catalogSearch.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="rounded-3xl border border-emerald-900/10 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Factory size={24} />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                Producer &amp; Administrator Portal
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-white mt-0.5">
                Circular EPR &amp; Deposit Configuration
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchMetrics();
                fetchRules();
                fetchCatalog();
              }}
              className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-white/20 transition"
            >
              <RotateCcw size={14} />
              <span>Refresh Stats</span>
            </button>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-800 pt-4">
          {[
            { id: "metrics", label: "Circular Dashboard", icon: BarChart3 },
            { id: "rules", label: "Deposit Rules", icon: Settings },
            { id: "catalog", label: "Product & Packaging Catalog", icon: Package },
            { id: "epr", label: "EPR Compliance & LCA", icon: Leaf },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                  active
                    ? "bg-emerald-500 text-slate-950 shadow-sm"
                    : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================
          TAB 1: CIRCULAR DASHBOARD
      ========================================================= */}
      {activeTab === "metrics" && (
        <div className="mt-8 space-y-6 animate-in fade-in duration-200">
          {/* Key KPI Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Circular Recovery Rate
              </span>
              <div className="text-4xl font-extrabold text-emerald-800 mt-2">
                {metrics?.recovery_rate_pct || 0}%
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                  style={{ width: `${Math.min(100, metrics?.recovery_rate_pct || 0)}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-500 mt-2">
                {metrics?.returned_packaging || 0} of {metrics?.total_packaging_issued || 0} returned
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Deposits in Circulation
              </span>
              <div className="text-4xl font-extrabold text-slate-900 mt-2">
                ₹{metrics?.deposits_held_inr?.toFixed(2) || "0.00"}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                Active packaging: {metrics?.active_packaging_in_circulation || 0} units
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Refunds Distributed
              </span>
              <div className="text-4xl font-extrabold text-teal-800 mt-2">
                ₹{metrics?.refunds_paid_inr?.toFixed(2) || "0.00"}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                Vouchers issued: {metrics?.vouchers_issued || 0}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Environmental Diverted
              </span>
              <div className="text-4xl font-extrabold text-emerald-700 mt-2">
                {metrics?.plastic_recovered_kg || 0} kg
              </div>
              <div className="text-xs text-slate-500 mt-2">
                CO₂e avoided: {metrics?.co2e_saved_kg || 0} kg
              </div>
            </div>
          </div>

          {/* Material Intake Breakdown */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Material Recovery by Packaging Type
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Physical material collected and verified through authorized Bengaluru DWCC intake centers.
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { mat: "PET Rigid Bottles", share: "72%", count: metrics?.returned_packaging || 0, deposit: "₹5.00/unit" },
                { mat: "Aluminium Cans", share: "18%", count: 0, deposit: "₹10.00/unit" },
                { mat: "Glass Bottles", share: "10%", count: 0, deposit: "₹5.00/unit" },
              ].map((m, i) => (
                <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex justify-between items-center font-bold text-xs text-slate-900">
                    <span>{m.mat}</span>
                    <span className="text-emerald-800">{m.share}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    Verified units: <span className="font-bold text-slate-800">{m.count}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Deposit rate: {m.deposit}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: DEPOSIT RULES CONFIGURATOR
      ========================================================= */}
      {activeTab === "rules" && (
        <div className="mt-8 space-y-6 animate-in fade-in duration-200">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Configured Deposit Rules</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Producers and regulators can adjust refundable deposit rates (in INR) per material and category.
                </p>
              </div>
              {ruleSaveMessage && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                  <CheckCircle2 size={13} />
                  {ruleSaveMessage}
                </span>
              )}
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                    <th className="py-2.5">Rule ID</th>
                    <th className="py-2.5">Material</th>
                    <th className="py-2.5">Category</th>
                    <th className="py-2.5">Deposit (INR)</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5">Notes</th>
                    <th className="py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {rules.map((rule) => {
                    const isEditing = editingRuleId === rule.id;
                    return (
                      <tr key={rule.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 font-mono text-slate-500 font-bold">{rule.id}</td>
                        <td className="py-3 font-bold text-slate-900">{rule.material || "General"}</td>
                        <td className="py-3 text-slate-600">{rule.category || "All Categories"}</td>
                        <td className="py-3 font-bold text-emerald-800">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.5"
                              value={editDepositInr}
                              onChange={(e) => setEditDepositInr(e.target.value)}
                              className="w-20 rounded-lg border border-slate-300 p-1 text-xs font-bold text-slate-900"
                            />
                          ) : (
                            `₹${rule.deposit_inr.toFixed(2)}`
                          )}
                        </td>
                        <td className="py-3">
                          {isEditing ? (
                            <select
                              value={editActive ? "1" : "0"}
                              onChange={(e) => setEditActive(e.target.value === "1")}
                              className="rounded-lg border border-slate-300 p-1 text-xs"
                            >
                              <option value="1">Active</option>
                              <option value="0">Inactive</option>
                            </select>
                          ) : (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                rule.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {rule.active ? "Active" : "Inactive"}
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-slate-500 max-w-xs truncate">{rule.notes}</td>
                        <td className="py-3 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleSaveRule(rule.id)}
                                className="rounded-lg bg-emerald-800 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingRuleId(null)}
                                className="rounded-lg bg-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-300"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingRuleId(rule.id);
                                setEditDepositInr(rule.deposit_inr);
                                setEditActive(Boolean(rule.active));
                              }}
                              className="text-xs font-bold text-emerald-800 hover:underline"
                            >
                              Edit Rule
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 3: PRODUCT & PACKAGING CATALOG
      ========================================================= */}
      {activeTab === "catalog" && (
        <div className="mt-8 space-y-6 animate-in fade-in duration-200">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Verified Product Catalog</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Indexed GTINs from GS1 India seed and runtime Open Food Facts lookups.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Filter by brand, material, GTIN..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                />
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                    <th className="py-2.5">GTIN</th>
                    <th className="py-2.5">Brand</th>
                    <th className="py-2.5">Product</th>
                    <th className="py-2.5">Material</th>
                    <th className="py-2.5">Weight</th>
                    <th className="py-2.5">EPR Category</th>
                    <th className="py-2.5">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredProducts.slice(0, 30).map((p) => (
                    <tr key={p.gtin} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 font-mono text-slate-500 font-bold">{p.gtin}</td>
                      <td className="py-3 font-bold text-slate-900">{p.brand}</td>
                      <td className="py-3 text-slate-800">{p.product}</td>
                      <td className="py-3 font-semibold text-emerald-900">{p.material}</td>
                      <td className="py-3 text-slate-600">{p.weight_g}g</td>
                      <td className="py-3">{p.epr_category || "Cat I"}</td>
                      <td className="py-3">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          {p.product_identity_source}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 4: EPR COMPLIANCE & LCA INTELLIGENCE (ORIGINAL FEATURE)
      ========================================================= */}
      {activeTab === "epr" && (
        <div className="mt-8 space-y-6 animate-in fade-in duration-200">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Plastic Waste Management EPR Analysis</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              CPCB PWM Framework compliance rules, penalty risks, and sustainable material alternatives.
            </p>

            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={analyzeGtin}
                onChange={(e) => setAnalyzeGtin(e.target.value)}
                placeholder="Enter GTIN for EPR audit"
                className="w-64 rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900"
              />
              <button
                onClick={() => runAnalysis(analyzeGtin)}
                className="rounded-xl bg-[#173d2b] px-4 py-2 text-xs font-bold text-white hover:bg-[#204e38]"
              >
                Analyze EPR
              </button>
            </div>

            {analysisResult && (
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <span className="text-xs font-semibold text-slate-500">EPR Category</span>
                  <div className="text-xl font-bold text-slate-900 mt-1">
                    {analysisResult.epr?.category || "Category I"}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Recyclability: {analysisResult.epr?.recyclability_pct || "85"}%
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <span className="text-xs font-semibold text-slate-500">Non-Compliance Penalty</span>
                  <div className="text-xl font-bold text-red-800 mt-1">
                    ₹{analysisResult.epr?.penalty_per_tonne?.toLocaleString() || "5,000"} / tonne
                  </div>
                  <div className="text-xs text-slate-500 mt-1">CPCB PWM regulatory rate</div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <span className="text-xs font-semibold text-slate-500">Recommended Alternative</span>
                  <div className="text-xl font-bold text-emerald-800 mt-1">
                    {analysisResult.substitute?.name || "100% rPET / Aluminium"}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Lower EPR liability</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
