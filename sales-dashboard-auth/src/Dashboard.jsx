import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const TOKEN_KEY = "auth_token";
const getToken = () => localStorage.getItem(TOKEN_KEY);

const lastMonth = (() => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
})();

const currency = (n) =>
  typeof n === "number" ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "$0";

export default function Dashboard({ auth }) {
  const [monthYear, setMonthYear] = useState(lastMonth);
  const [top, setTop] = useState([]);
  const [bottom, setBottom] = useState([]);
  const [total, setTotal] = useState(0);
  const [topRegion, setTopRegion] = useState("-");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [dark, setDark] = useState(true);
  const token = getToken();

  const axisColor = dark ? "#94a3b8" : "#475569";
  const gridColor = dark ? "#0f172a" : "#e2e8f0";
  const colorTop = dark ? "#2563eb" : "#1d4ed8";
  const colorBottom = dark ? "#ea580c" : "#c2410c";

  const repTooltip = {
    formatter: (v, _name, payloadArr) => {
      const p = payloadArr?.[0]?.payload;
      return [currency(Number(v)), `Customers: ${p?.CustomerCount ?? 0}`];
    },
    contentStyle: {
      background: dark ? "#0b1220" : "#ffffff",
      color: dark ? "#e2e8f0" : "#0f172a",
      border: `1px solid ${dark ? "#1e293b" : "#e2e8f0"}`,
      borderRadius: "12px",
    },
    labelFormatter: (label) => String(label || "(no name)"),
  };

  const fetchMode = async (mode) => {
    const q = new URLSearchParams({ monthYear, mode });
    const res = await fetch(`/api/getTopSalesReps?${q.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || `API ${mode} failed`);
    }
    return res.json();
  };

  const loadData = async () => {
    try {
      setErr(null);
      setLoading(true);
      const [topData, bottomData, totalData, regionData] = await Promise.all([
        fetchMode("top"),
        fetchMode("bottom"),
        fetchMode("total"),
        fetchMode("region"),
      ]);

      // Normalize
      setTop(
        (topData || []).map((r) => ({
          ...r,
          FullName: r.FullName || `Rep ${r.SalesRepID}`,
          TotalRevenue: Number(r.TotalRevenue || 0),
          CustomerCount: Number(r.CustomerCount || 0),
        }))
      );
      setBottom(
        (bottomData || []).map((r) => ({
          ...r,
          FullName: r.FullName || `Rep ${r.SalesRepID}`,
          TotalRevenue: Number(r.TotalRevenue || 0),
          CustomerCount: Number(r.CustomerCount || 0),
        }))
      );
      setTotal(Number(totalData?.[0]?.TotalSales || 0));

      const best = (regionData || []).slice().sort((a, b) => (b.TotalSales || 0) - (a.TotalSales || 0))[0];
      setTopRegion(best?.RegionName || "-");
    } catch (e) {
      setErr(e.message || "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); /* eslint-disable-next-line */ }, [monthYear]);

  return (
    <div className={`min-h-screen ${dark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 border-b ${dark ? "border-slate-800 bg-slate-950/70" : "border-slate-200 bg-white/70"} backdrop-blur`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-center">Sales Performance Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className={`text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>Period:</label>
            <input
              type="month"
              value={monthYear}
              onChange={(e) => setMonthYear(e.target.value)}
              className={`rounded-xl px-3 py-2 focus:outline-none focus:ring-2 ${
                dark ? "bg-slate-900 border border-slate-800 focus:ring-blue-600" : "bg-white border border-slate-300 focus:ring-blue-600"
              }`}
            />
            <button
              onClick={loadData}
              className={`rounded-xl px-4 py-2 ${
                dark ? "border border-slate-800 hover:bg-slate-900/60" : "border border-slate-300 hover:bg-slate-100"
              }`}
            >
              Refresh
            </button>
            <button
              onClick={() => setDark((v) => !v)}
              className={`rounded-xl px-4 py-2 ${
                dark ? "border border-slate-800 hover:bg-slate-900/60" : "border border-slate-300 hover:bg-slate-100"
              }`}
            >
              {dark ? "Light mode" : "Dark mode"}
            </button>
            <button
              onClick={auth?.logout}
              className={`rounded-xl px-4 py-2 ${
                dark ? "border border-slate-800 hover:bg-slate-900/60" : "border border-slate-300 hover:bg-slate-100"
              }`}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-8 space-y-6">
        {err && (
          <div className={`rounded-xl border ${dark ? "border-red-500/30 bg-red-500/10 text-red-200" : "border-red-200 bg-red-50 text-red-700"} p-4`}>
            {err}
          </div>
        )}

        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card dark={dark} title="Total Revenue" subtitle={`for ${monthYear}`} value={currency(total)} icon="💰" iconBg="#16a34a" />
          <Card dark={dark} title="Top Region" subtitle="by monthly sales" value={topRegion} icon="🌐" iconBg="#059669" />
          <Card
            dark={dark}
            title="Average Revenue"
            subtitle="Across top 10"
            value={currency(top.reduce((a, b) => a + (b.TotalRevenue || 0), 0) / Math.max(top.length, 1))}
            icon="📈"
            iconBg="#2563eb"
          />
          <Card
            dark={dark}
            title="Top Performer"
            subtitle={currency((top[0]?.TotalRevenue) || 0)}
            value={top[0]?.FullName || "N/A"}
            icon="⭐"
            iconBg="#f59e0b"
          />
        </div>

        {/* Top 10 */}
        <Section dark={dark} title="Top 10 Sales Representatives" subtitle={`Revenue performance for ${monthYear}`}>
          <div className="h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top} margin={{ top: 12, right: 24, bottom: 12, left: 24 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="FullName" tick={{ fontSize: 12, fill: axisColor }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fill: axisColor }} tickFormatter={(v) => (typeof v === "number" ? `${Math.round(v / 1000)}k` : String(v))} />
                <Tooltip {...repTooltip} />
                <Bar dataKey="TotalRevenue" fill={colorTop} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        {/* Bottom 5 */}
        <Section dark={dark} title="Bottom 5 Sales Representatives" subtitle={`Zeros included • ${monthYear}`}>
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bottom} margin={{ top: 12, right: 24, bottom: 12, left: 24 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="FullName" tick={{ fontSize: 12, fill: axisColor }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fill: axisColor }} tickFormatter={(v) => (typeof v === "number" ? `${Math.round(v / 1000)}k` : String(v))} />
                <Tooltip {...repTooltip} />
                <Bar dataKey="TotalRevenue" fill={colorBottom} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        {loading && (
          <div className={`text-center ${dark ? "text-slate-400" : "text-slate-500"}`}>Loading…</div>
        )}
      </main>
    </div>
  );
}

function Card({ dark, title, subtitle, value, icon, iconBg }) {
  const base = dark
    ? "rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-[0_6px_30px_-12px_rgba(0,0,0,.5)] backdrop-blur"
    : "rounded-2xl bg-white border border-slate-200 shadow-[0_6px_30px_-12px_rgba(2,6,23,.15)]";
  const subText = dark ? "text-slate-400" : "text-slate-500";
  return (
    <div className={`${base} p-6 text-center`}>
      <div className="flex flex-col items-center gap-3">
        <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm" style={{ background: iconBg }}>
          {icon}
        </div>
        <div>
          <p className={`text-sm ${subText}`}>{title}</p>
          <p className="mt-1 text-2xl font-bold text-center">{value}</p>
          <p className={`mt-2 text-xs ${subText} text-center`}>{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function Section({ dark, title, subtitle, children }) {
  const base = dark
    ? "rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-[0_6px_30px_-12px_rgba(0,0,0,.5)] backdrop-blur"
    : "rounded-2xl bg-white border border-slate-200 shadow-[0_6px_30px_-12px_rgba(2,6,23,.15)]";
  const subText = dark ? "text-slate-400" : "text-slate-500";
  return (
    <div className={`${base} p-6`}>
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-center">{title}</h2>
          <p className={`text-xs ${subText} text-center`}>{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}