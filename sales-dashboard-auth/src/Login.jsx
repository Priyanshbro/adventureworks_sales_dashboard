import React, { useState } from "react";

/**
 * Dribbble-inspired login with animated cube hero on the left
 * and a clean, aligned sign-in card on the right.
 * Required props:
 *   onLogin: (username, password) => Promise<void> | void
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
    if (!username || !password) {
      setLocalError("Please enter both username and password.");
      return;
    }
    try {
      setSubmitting(true);
      await onLogin?.(username.trim(), password);
    } catch (err) {
      setLocalError(err?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-wrap">
      {/* Left hero with animated cube */}
      <section className="login-hero">
        <div className="hero-inner">
          <div className="brand-lockup">
            <div className="brand-mark">📊</div>
            <div className="brand-text">
              <h2>Sales Performance</h2>
              <p>Insightful analytics for your team</p>
            </div>
          </div>

          <div className="hero-title">
            <h1>Sign in to your<br/>Sales Performance Dashboard</h1>
          </div>

          {/* Decorative/animated cube */}
          <div className="cube-stage" aria-hidden>
            <div className="cube">
              <div className="cube-face cube-front" />
              <div className="cube-face cube-back" />
              <div className="cube-face cube-right" />
              <div className="cube-face cube-left" />
              <div className="cube-face cube-top" />
              <div className="cube-face cube-bottom" />
            </div>
          </div>
        </div>
      </section>

      {/* Right card with the form */}
      <section className="login-side">
        <div className="login-card pro">
          <header className="login-header">
            <div className="lockup">
              <div className="dot" />
              <h3>Welcome back</h3>
            </div>
            <p className="sub">Please sign in to continue</p>
          </header>

          {(localError || error) && (
            <div className="alert">{localError || error}</div>
          )}

          <form className="login-form compact" onSubmit={handleSubmit} noValidate>
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

            <button className="primary-btn xl" disabled={submitting}>
              {submitting ? (
                <span className="btn-spin">
                  <span className="spinner" />
                  Signing in…
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}