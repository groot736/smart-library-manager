import { useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth";

const demoAccounts = [
  { label: "Admin", email: "admin@unilib.ai", password: "Password@123" },
  { label: "Faculty", email: "faculty@unilib.ai", password: "Password@123" },
  { label: "Student", email: "student@unilib.ai", password: "Password@123" },
];

export const LoginPage = () => {
  const [email, setEmail] = useState("admin@unilib.ai");
  const [password, setPassword] = useState("Password@123");
  const [error, setError] = useState("");
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await api.post("/auth/login", { email, password });
      setAuth(res.data.token, res.data.user, res.data.refreshToken);
      navigate("/");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        setError(message ?? "Login failed. Make sure backend is running and seed data exists.");
      } else {
        setError("Login failed. Make sure backend is running and seed data exists.");
      }
    }
  };

  const loginWithGoogleMock = async () => {
    setError("");
    try {
      const res = await api.post("/auth/oauth/mock", {
        provider: "google",
        email,
        name: email.split("@")[0].replace(/[._-]/g, " "),
        role: "STUDENT",
      });
      setAuth(res.data.token, res.data.user, res.data.refreshToken);
      navigate("/");
    } catch {
      setError("OAuth mock login failed. Please try normal login.");
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-xl">
      <h1 className="mb-1 text-2xl font-bold">Welcome Back</h1>
      <p className="mb-5 text-sm opacity-80">Sign in with your university account.</p>

      <div className="mb-4 flex flex-wrap gap-2">
        {demoAccounts.map((account) => (
          <button
            key={account.email}
            type="button"
            onClick={() => {
              setEmail(account.email);
              setPassword(account.password);
            }}
            className="rounded-xl border border-white/25 px-3 py-1.5 text-xs hover:bg-white/10"
          >
            Use {account.label}
          </button>
        ))}
      </div>

      <form className="space-y-3" onSubmit={submit}>
        <input className="field w-full" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input className="field w-full" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        {error ? <div className="rounded-xl border border-rose-300/30 bg-rose-400/15 p-2 text-sm text-rose-100">{error}</div> : null}
        <button className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2.5 font-semibold text-white">
          Login
        </button>
        <button type="button" onClick={loginWithGoogleMock} className="w-full rounded-xl border border-white/25 bg-white/5 px-4 py-2.5 text-sm font-semibold hover:bg-white/10">
          Continue with Google (Mock OAuth)
        </button>
      </form>
    </div>
  );
};
