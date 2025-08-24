import React, { useState } from "react";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === "admin" && password === "password123") {
      const token = "mock-jwt-token"; // Replace with real token generation in production
      localStorage.setItem("token", token);
      window.location.href = "/dashboard";
    } else {
      alert("Invalid credentials");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-10 rounded-2xl shadow-2xl w-full max-w-md flex flex-col items-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2 text-center">
          Welcome to your
        </h1>
        <h2 className="text-2xl font-semibold text-blue-600 dark:text-blue-400 mb-8 text-center">
          Sales Performance Dashboard
        </h2>
        <form onSubmit={handleSubmit} className="w-full">
          <div className="mb-5">
            <label
              htmlFor="username"
              className="block text-gray-700 dark:text-gray-200 font-medium mb-2"
            >
              Username
            </label>
            <input
              id="username"
              className="w-full p-3 border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="mb-6">
            <label
              htmlFor="password"
              className="block text-gray-700 dark:text-gray-200 font-medium mb-2"
            >
              Password
            </label>
            <input
              id="password"
              className="w-full p-3 border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white text-lg font-semibold py-3 rounded-lg shadow-lg hover:bg-blue-700 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            Log In
          </button>
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
            Hint: <span className="font-mono">admin / password123</span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;