import React, { useMemo } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./Login.jsx";
import Dashboard from "./Dashboard.jsx";

const TOKEN_KEY = "auth_token";

function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
function getToken() { return localStorage.getItem(TOKEN_KEY); }
function clearToken() { localStorage.removeItem(TOKEN_KEY); }

function Protected({ children }) {
  const token = getToken();
  if (!token) return <Navigate to="/login" replace />;
  try {
    // Optionally, decode and check token expiration here
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      clearToken();
      return <Navigate to="/login" replace />;
    }
  } catch {
    clearToken();
    return <Navigate to="/login" replace />;
  }
  return children;
}

function LoginRoute() {
  const navigate = useNavigate();

  const onLogin = async (username, password) => {
    const resp = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(data?.error || "Login failed");
    }
    const { token } = await resp.json();
    if (!token) throw new Error("No token returned from API");
    setToken(token);
    navigate("/dashboard", { replace: true });
  };

  return <Login onLogin={onLogin} />;
}

export default function App() {
  const auth = useMemo(
    () => ({
      token: getToken(),
      logout: () => { clearToken(); window.location.assign("/login"); },
    }),
    []
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route
          path="/dashboard"
          element={
            <Protected>
              <Dashboard auth={auth} />
            </Protected>
          }
        />
        <Route
          path="/"
          element={getToken() ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}