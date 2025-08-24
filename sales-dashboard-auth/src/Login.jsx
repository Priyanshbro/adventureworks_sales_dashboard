import React, { useState } from "react";

/**
 * Pixel-precise login with animated 3D 3×3 cube.
 * - Pure CSS/JSX (no libs)
 * - Responsive, perfectly centered
 * - Glassmorphism card + subtle vignette + gradient backdrop
 * - Cube rotates on a smooth multi-axis loop
 *
 * Props:
 *   onLogin: (username: string, password: string) => Promise<void> | void
 *   error?: string
 */
export default function Login({ onLogin, error }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    const u = username.trim();
    if (!u || !password) {
      setLocalError("Please enter both username and password.");
      return;
    }
    try {
      setSubmitting(true);
      await onLogin?.(u, password);
    } catch (err) {
      setLocalError(err?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      {/* Decorative gradient + vignette */}
      <div className="bg" />
      <div className="vignette" />

      {/* Cube */}
      <div className="stage" aria-hidden>
        <div className="cube">
          {["front", "back", "right", "left", "top", "bottom"].map((face) => (
            <div key={face} className={`face ${face}`}>
              {/* 3×3 stickers */}
              {Array.from({ length: 9 }).map((_, idx) => (
                <span key={idx} className="sticker" />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Login Card */}
      <main className="card" role="main">
        <h1 className="title">Sign in to your Sales Performance Dashboard</h1>
        <p className="subtitle">Enter your credentials to continue</p>

        {(localError || error) && (
          <div className="alert" role="alert" aria-live="polite">
            {localError || error}
          </div>
        )}

        <form className="form" onSubmit={handleSubmit} noValidate>
          <label className="label">
            <span>Username</span>
            <input
              type="text"
              className="input"
              placeholder="e.g. admin"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>

          <label className="label">
            <span>Password</span>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </main>

      <style>{`
/* -------------------------
   Design Tokens
------------------------- */
:root{
  /* Palette tuned to match dashboard brand */
  --bg1: #0f0f12;            /* deep base */
  --bg2: #1b1229;            /* gradient stop 1 */
  --bg3: #0b2b36;            /* gradient stop 2 */
  --accent: #8b5cf6;         /* primary accent (purple) */
  --accent-2: #22d3ee;       /* secondary accent (cyan) */
  --card-bg: rgba(255,255,255,0.06);
  --card-stroke: rgba(255,255,255,0.12);
  --text-strong: #ffffff;
  --text: rgba(255,255,255,0.82);
  --muted: rgba(255,255,255,0.64);
  --input-bg: rgba(255,255,255,0.08);
  --input-stroke: rgba(255,255,255,0.16);
  --input-focus: rgba(139,92,246,0.45);
  --shadow: 0 20px 60px rgba(0,0,0,0.55), inset 0 0 0 1px var(--card-stroke);
  --radius-2xl: 20px;
  --radius-lg: 14px;
  --radius-md: 12px;
}

/* -------------------------
   Page Layout
------------------------- */
* { box-sizing: border-box; }
html, body, #root { height: 100%; }
body { margin: 0; background: #000; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial; }

.page{
  position: relative;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  overflow: hidden;
}

/* Gradient background */
.bg{
  position: absolute;
  inset: -10%;
  background:
    radial-gradient(1200px 800px at 10% 10%, color-mix(in oklab, var(--accent) 35%, transparent), transparent 60%),
    radial-gradient(900px 600px at 90% 20%, color-mix(in oklab, var(--accent-2) 40%, transparent), transparent 60%),
    linear-gradient(135deg, var(--bg2), var(--bg3) 45%, var(--bg1));
  filter: saturate(1.05) contrast(1.04);
  z-index: 0;
}

/* Soft vignette for focus */
.vignette{
  position: absolute; inset: 0;
  pointer-events: none;
  background:
    radial-gradient(80% 80% at 50% 45%, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.35) 100%);
  z-index: 1;
}

/* -------------------------
   Cube (3D)
------------------------- */
.stage{
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  perspective: 1400px;
  z-index: 1;
}
.cube{
  position: relative;
  width: min(42vmin, 380px);
  height: min(42vmin, 380px);
  transform-style: preserve-3d;
  animation: spin 12s cubic-bezier(.22,.61,.36,1) infinite;
  filter: drop-shadow(0 30px 60px rgba(0,0,0,0.5));
}
@keyframes spin{
  0%   { transform: rotateX(-12deg) rotateY(25deg) rotateZ(0deg);   }
  25%  { transform: rotateX(12deg)  rotateY(205deg) rotateZ(2deg);  }
  50%  { transform: rotateX(18deg)  rotateY(385deg) rotateZ(-2deg); }
  75%  { transform: rotateX(-10deg) rotateY(565deg) rotateZ(0deg);  }
  100% { transform: rotateX(-12deg) rotateY(745deg) rotateZ(0deg);  }
}
/* Faces */
.face{
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: 1fr;
  gap: calc(1.6% + 1px);
  padding: 3%;
  background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 12px;
  box-shadow: inset 0 0 40px rgba(0,0,0,0.25);
}
/* Sticker tiles with subtle depth */
.sticker{
  display: block;
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.04));
  box-shadow:
    inset 0 0 0 1px rgba(255,255,255,0.22),
    inset 0 -10px 20px rgba(0,0,0,0.25),
    0 4px 10px rgba(0,0,0,0.35);
}
/* Assign per-face hues for that "brand cube" look */
.front  .sticker{ background: linear-gradient(180deg, color-mix(in oklab, var(--accent) 68%, #ffffff 0%), color-mix(in oklab, var(--accent) 25%, #0a0a0a 0%)); }
.back   .sticker{ background: linear-gradient(180deg, color-mix(in oklab, #f59e0b 68%, #ffffff 0%), color-mix(in oklab, #f59e0b 25%, #0a0a0a 0%)); }
.right  .sticker{ background: linear-gradient(180deg, color-mix(in oklab, var(--accent-2) 68%, #ffffff 0%), color-mix(in oklab, var(--accent-2) 25%, #0a0a0a 0%)); }
.left   .sticker{ background: linear-gradient(180deg, color-mix(in oklab, #22c55e 68%, #ffffff 0%), color-mix(in oklab, #22c55e 25%, #0a0a0a 0%)); }
.top    .sticker{ background: linear-gradient(180deg, color-mix(in oklab, #e2e8f0 68%, #ffffff 0%), color-mix(in oklab, #94a3b8 25%, #0a0a0a 0%)); }
.bottom .sticker{ background: linear-gradient(180deg, color-mix(in oklab, #ef4444 68%, #ffffff 0%), color-mix(in oklab, #ef4444 25%, #0a0a0a 0%)); }
/* Face placement in 3D */
.face.front  { transform: translateZ(calc(min(42vmin,380px) / 2)); }
.face.back   { transform: rotateY(180deg) translateZ(calc(min(42vmin,380px) / 2)); }
.face.right  { transform: rotateY(90deg)  translateZ(calc(min(42vmin,380px) / 2)); }
.face.left   { transform: rotateY(-90deg) translateZ(calc(min(42vmin,380px) / 2)); }
.face.top    { transform: rotateX(90deg)  translateZ(calc(min(42vmin,380px) / 2)); }
.face.bottom { transform: rotateX(-90deg) translateZ(calc(min(42vmin,380px) / 2)); }

/* -------------------------
   Card
------------------------- */
.card{
  position: relative;
  z-index: 2;
  width: min(520px, 92vw);
  padding: 28px;
  border-radius: var(--radius-2xl);
  background: var(--card-bg);
  backdrop-filter: blur(14px) saturate(1.2);
  box-shadow: var(--shadow);
  border: 1px solid var(--card-stroke);
  color: var(--text);
  text-align: center;
}
.title{
  margin: 2px 0 2px;
  font-weight: 800;
  font-size: 26px;
  line-height: 1.2;
  color: var(--text-strong);
  letter-spacing: 0.2px;
}
.subtitle{
  margin: 0 0 16px;
  font-size: 14px;
  color: var(--muted);
}
.alert{
  margin: 0 0 14px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(239,68,68,0.12);
  color: #fecaca;
  border: 1px solid rgba(239,68,68,0.35);
  text-align: left;
}
.form{
  display: grid;
  gap: 14px;
}
.label{
  display: grid;
  gap: 6px;
  font-size: 13px;
  color: var(--muted);
  text-align: left;
}
.input{
  appearance: none;
  width: 100%;
  padding: 12px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--input-stroke);
  background: var(--input-bg);
  color: var(--text-strong);
  outline: none;
  transition: border-color .2s, box-shadow .2s, background .2s;
}
.input::placeholder{ color: rgba(255,255,255,0.45); }
.input:focus{
  border-color: var(--input-focus);
  box-shadow: 0 0 0 4px color-mix(in oklab, var(--input-focus) 35%, transparent);
  background: rgba(255,255,255,0.10);
}
.btn{
  margin-top: 4px;
  width: 100%;
  padding: 12px 14px;
  border: 0;
  border-radius: var(--radius-lg);
  font-weight: 800;
  color: #0b0b0e;
  background:
    linear-gradient(180deg, #ffffff, #e9e9ff);
  box-shadow:
    0 10px 24px rgba(0,0,0,0.25),
    inset 0 0 0 1px rgba(255,255,255,0.85);
  cursor: pointer;
  transition: transform .08s ease, box-shadow .2s ease, opacity .15s ease;
}
.btn:active{ transform: translateY(1px); }
.btn:hover{
  box-shadow:
    0 16px 32px rgba(0,0,0,0.3),
    inset 0 0 0 1px rgba(255,255,255,0.95);
  opacity: .98;
}

/* Responsiveness */
@media (max-width: 860px){
  .cube{ width: min(48vmin, 340px); height: min(48vmin, 340px); }
}
@media (max-width: 640px){
  .cube{ width: min(64vmin, 300px); height: min(64vmin, 300px); }
  .card{ width: min(480px, 92vw); }
}
      `}</style>
    </div>
  );
}