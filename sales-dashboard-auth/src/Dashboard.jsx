// src/Dashboard.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const TOKEN_KEY = "auth_token";
const getToken = () => localStorage.getItem(TOKEN_KEY);

// ---------- UI bits ----------
function Card({ children, className = "", dark }) {
  const base = dark
    ? "rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-[0_6px_30px_-12px_rgba(0,0,0,.55)] backdrop-blur"
    : "rounded-2xl bg-white border border-slate-200 shadow-[0_6px_30px_-12px_rgba(2,6,23,.12)]";
  return <div className={`${base} ${className}`}>{children}</div>;
}

function IconCircle({ children, tone = "#0ea5e9" }) {
  return (
    <div
      className="h-10 w-10 rounded-xl flex items-center justify-center"
      style={{ background: tone }}
    >
      {children}
    </div>
  );
}

const GlobeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c3 4.5 3 13.5 0 18M12 3c-3 4.5-3 13.5 0 18" />
  </svg>
);
const StarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff" stroke="none">
    <path d="M12 2l2.9 6.2 6.8.6-5 4.4 1.5 6.7L12 16.8 5.8 19.9 7.3 13.2 2.3 8.8l6.8-.6L12 2z" />
  </svg>
);
const TrendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
    <path d="M3 17l6-6 4 4 7-7" />
    <path d="M21 10V3h-7" />
  </svg>
);
const MoneyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8">
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <circle cx="12" cy="12" r="3.2" fill="none" />
  </svg>
);

// ---------- helpers ----------
const currency = (n) =>
  typeof n === "number" ? n.toLocaleString(undefined, { style: "currency", currency: "USD" }) : "-";

function useMonthNow() {
  return useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);
}

async function apiFetch(path, monthYear) {
  const token = getToken();
  const url = new URL(path, window.location.origin);
  if (monthYear) url.searchParams.set("monthYear", monthYear);

  const res = await fetch(url.toString(), {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token || ""}`,
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ---------- main ----------
export default function Dashboard({ auth }) {
  const monthNow = useMonthNow();
  const [monthYear, setMonthYear] = useState(monthNow);
  const [dark, setDark] = useState(true);

  const [top, setTop] = useState([]);
  const [bottom, setBottom] = useState([]);
  const [regions, setRegions] = useState([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [selected, setSelected] = useState(null);

  // palette
  const colorTop = dark ? "#2563eb" : "#1d4ed8";
  const colorBottom = dark ? "#f97316" : "#ea580c";
  const axisColor = dark ? "#94a3b8" : "#475569";
  const gridColor = dark ? "#0f172a" : "#e2e8f0";
  const pageBg = dark ? "dashboard-bg dark-mode" : "dashboard-bg";
  const subText = "dashboard-kpi-sub";

  const repTooltip = {
    formatter: (v, n, payloadArr) => {
      const payload = payloadArr && payloadArr[0] && payloadArr[0].payload;
      const cc = payload?.CustomerCount ?? null;
      return [currency(Number(v)), cc != null ? `Revenue • Customers: ${cc}` : n];
    },
    contentStyle: {
      background: dark ? "#0b1220" : "#ffffff",
      color: dark ? "#e2e8f0" : "#0f172a",
      border: `1px solid ${dark ? "#1e293b" : "#e2e8f0"}`,
      borderRadius: 12,
    },
    labelFormatter: (label) => String(label || "(no name)"),
  };

  const topRegionName = useMemo(() => {
    if (!regions?.length) return "-";
    const copy = [...regions].sort((a, b) => (b.TotalSales ?? 0) - (a.TotalSales ?? 0));
    return copy[0]?.RegionName || "-";
  }, [regions]);

  const averageTop = useMemo(() => {
    if (!top?.length) return 0;
    const sum = top.reduce((a, b) => a + (b.TotalRevenue ?? 0), 0);
    return sum / top.length;
  }, [top]);

  const loadData = useCallback(async () => {
    setErr("");
    setLoading(true);
    try {
      // These match your Azure Function: /api/sales?mode=xxx&monthYear=YYYY-MM
      const [t, b, tot, reg] = await Promise.all([
        apiFetch(`/api/sales?mode=top`, monthYear),
        apiFetch(`/api/sales?mode=bottom`, monthYear),
        apiFetch(`/api/sales?mode=total`, monthYear),
        apiFetch(`/api/sales?mode=region`, monthYear),
      ]);
      setTop(Array.isArray(t) ? t : []);
      setBottom(Array.isArray(b) ? b : []);
      setTotal(Number(tot?.[0]?.TotalSales ?? 0));
      setRegions(Array.isArray(reg) ? reg : []);
    } catch (e) {
      setErr(e.message || "Failed to load data");
      setTop([]);
      setBottom([]);
      setTotal(0);
      setRegions([]);
    } finally {
      setLoading(false);
    }
  }, [monthYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <>
      <div className={pageBg}>
        {/* Header */}
        <header className="dashboard-header">
          <div>
            <div className="dashboard-title">Sales Performance Dashboard</div>
            <div className="dashboard-subtitle">Track top performers and analyze revenue trends</div>
          </div>
          <div className="dashboard-controls">
            <label>Period:</label>
            <input type="month" value={monthYear} onChange={e => setMonthYear(e.target.value)} />
            <button className="dashboard-btn" onClick={loadData}>Refresh</button>
            <button className="dashboard-btn" onClick={() => setDark(v => !v)}>{dark ? "Light mode" : "Dark mode"}</button>
            {auth?.logout && <button className="dashboard-btn" onClick={auth.logout}>Logout</button>}
          </div>
        </header>

  <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
          {/* Error banner */}
          {err && (
            <div className="dashboard-error">{err}</div>
          )}

          {/* KPI row */}
          <div className="dashboard-kpi-row">
            <div className="dashboard-card">
              <div className="dashboard-kpi-title">
                <span style={{display:'inline-flex',alignItems:'center'}}>
                  {/* Money/Wallet Icon */}
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><rect x="2" y="7" width="20" height="13" rx="3"/><path d="M16 3H8a3 3 0 0 0-3 3v1h14V6a3 3 0 0 0-3-3z"/><circle cx="17" cy="13" r="2"/></svg>
                  Total Revenue
                </span>
              </div>
              <div className="dashboard-kpi-value">{loading ? "…" : currency(total)}</div>
              <div className="dashboard-kpi-sub">for {monthYear}</div>
            </div>

            <div className="dashboard-card">
              <div className="dashboard-kpi-title">
                <span style={{display:'inline-flex',alignItems:'center'}}>
                  {/* Location Pin Icon */}
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M12 21c-4.418 0-8-5.373-8-10a8 8 0 1 1 16 0c0 4.627-3.582 10-8 10z"/><circle cx="12" cy="11" r="3"/></svg>
                  Top Region
                </span>
              </div>
              <div className="dashboard-kpi-value">{loading ? "…" : topRegionName}</div>
              <div className="dashboard-kpi-sub">by monthly sales</div>
            </div>

            <div className="dashboard-card">
              <div className="dashboard-kpi-title">
                <span style={{display:'inline-flex',alignItems:'center'}}>
                  {/* Chart/Graph Icon */}
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M4 19V13M9 19V8M14 19V5M19 19V11"/></svg>
                  Average Revenue
                </span>
              </div>
              <div className="dashboard-kpi-value">{loading ? "…" : currency(averageTop)}</div>
              <div className="dashboard-kpi-sub">Across top 10</div>
            </div>

            <div className="dashboard-card">
              <div className="dashboard-kpi-title">
                <span style={{display:'inline-flex',alignItems:'center'}}>
                  {/* Trophy Icon */}
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1"><path d="M17 3H7v4a5 5 0 0 0 10 0V3z"/><path d="M4 7a8 8 0 0 0 16 0"/><path d="M12 17v4"/><path d="M8 21h8"/></svg>
                  Top Performer
                </span>
              </div>
              <div className="dashboard-kpi-value">{loading ? "…" : (top?.[0]?.FullName || "-")}</div>
              <div className="dashboard-kpi-sub">{loading ? "…" : currency(top?.[0]?.TotalRevenue ?? 0)}</div>
            </div>
          </div>

          {/* Top 10 */}
          <div className="dashboard-card">
            <div className="dashboard-section-title">Top 10 Sales Representatives</div>
            <div className="dashboard-section-sub">Revenue performance for {monthYear}</div>
            <div style={{ height: 420 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top} margin={{ top: 12, right: 24, bottom: 12, left: 24 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis
                    dataKey="FullName"
                    tick={{ fontSize: 12, fill: axisColor }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fill: axisColor }}
                    tickFormatter={v => (typeof v === "number" ? `${v / 1000}k` : String(v))}
                  />
                  <Tooltip {...repTooltip} />
                  <Bar
                    dataKey="TotalRevenue"
                    fill={colorTop}
                    radius={[4, 4, 0, 0]}
                    onClick={(_, idx) => setSelected(top[idx])}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom 5 */}
          <div className="dashboard-card">
            <div className="dashboard-section-title">Bottom 5 Sales Representatives</div>
            <div className="dashboard-section-sub">Zeros included • {monthYear}</div>
            <div style={{ height: 360 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bottom} margin={{ top: 12, right: 24, bottom: 12, left: 24 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis
                    dataKey="FullName"
                    tick={{ fontSize: 12, fill: axisColor }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fill: axisColor }}
                    tickFormatter={v => (typeof v === "number" ? `${v / 1000}k` : String(v))}
                  />
                  <Tooltip {...repTooltip} />
                  <Bar
                    dataKey="TotalRevenue"
                    fill={colorBottom}
                    radius={[4, 4, 0, 0]}
                    onClick={(_, idx) => setSelected(bottom[idx])}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </main>
      </div>

      {/* Modal */}
      {selected && (
        <>
          <div className="dashboard-modal-bg" onClick={() => setSelected(null)} />
          <div className="dashboard-modal">
            <button className="dashboard-modal-close" onClick={() => setSelected(null)}>✕</button>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: 16 }}>{selected?.FullName || "Sales Rep"}</h3>
            <div className="dashboard-modal-row">
              <span className="dashboard-modal-label">SalesRepID</span>
              <span className="dashboard-modal-value">{selected?.SalesRepID}</span>
            </div>
            <div className="dashboard-modal-row">
              <span className="dashboard-modal-label">Full Name</span>
              <span className="dashboard-modal-value">{selected?.FullName || "(not provided)"}</span>
            </div>
            <div className="dashboard-modal-row">
              <span className="dashboard-modal-label">Total Revenue</span>
              <span className="dashboard-modal-value">{currency(selected?.TotalRevenue ?? 0)}</span>
            </div>
            <div className="dashboard-modal-row">
              <span className="dashboard-modal-label">Customer Count</span>
              <span className="dashboard-modal-value">{selected?.CustomerCount ?? 0}</span>
            </div>
          </div>
        </>
      )}
    </>
  );
}