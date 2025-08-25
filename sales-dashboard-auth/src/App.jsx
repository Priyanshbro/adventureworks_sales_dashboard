import React, { useMemo } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./Login.jsx";
import Dashboard from "./Dashboard.jsx";

const LOGIN_KEY = "is_logged_in";

function setLoggedIn(val) { localStorage.setItem(LOGIN_KEY, val ? "1" : "0"); }
function isLoggedIn() { return localStorage.getItem(LOGIN_KEY) === "1"; }
function clearLogin() { localStorage.removeItem(LOGIN_KEY); }

function Protected({ children }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
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
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.success) {
      throw new Error(data?.error || "Login failed");
    }
    setLoggedIn(true);
    navigate("/dashboard", { replace: true });
  };

  return <Login onLogin={onLogin} />;
}

export default function App() {
  const auth = useMemo(
    () => ({
      loggedIn: isLoggedIn(),
      logout: () => { clearLogin(); window.location.assign("/login"); },
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
          element={isLoggedIn() ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}