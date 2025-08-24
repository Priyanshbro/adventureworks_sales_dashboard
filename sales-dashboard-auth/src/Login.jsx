import React, { useState } from "react";

export default function Login({ onLogin, error }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    if (!username || !password) {
      setLocalError("Please enter both username and password.");
      return;
    }
    try {
      setSubmitting(true);
      await onLogin?.(username.trim(), password);
    } catch (err) {
      setLocalError(err?.message || "Login failed. Please try again.");
    } finally {
      setSubmitting(false);
      if (!remember) setPassword("");
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand">
          <div className="brand-mark" aria-hidden>📊</div>
          <div className="brand-text">
            <h1>Welcome to your Sales Performance Dashboard</h1>
            <p>Sign in to view KPIs, top reps, and trends.</p>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          {(localError || error) && <div className="alert">{localError || error}</div>}

          <label className="field">
            <span>Username</span>
            <input
              type="text"
              autoComplete="username"
              placeholder="e.g. admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <div className="row between">
            <label className="checkbox">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span>Remember me</span>
            </label>
            <a className="muted" href="#" onClick={(e) => e.preventDefault()}>
              Forgot password?
            </a>
          </div>

          <button className="primary-btn" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>

          <p className="foot-note">Hint: <code>admin</code> / <code>password123</code></p>
        </form>
      </div>
    </div>
  );
}