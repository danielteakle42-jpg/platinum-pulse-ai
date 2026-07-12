"use client";

import {
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type LoadingState = "google" | "email" | "reset" | "admin" | null;

export default function LoginPanel() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState<LoadingState>(null);
  const [message, setMessage] = useState("");

  const supabase = createClient();

  function getAuthCallbackUrl() {
    return `${window.location.origin}/auth/callback`;
  }

  function getResetPasswordUrl() {
    return `${window.location.origin}/reset-password`;
  }

  function looksLikeEmail(value: string) {
    return value.includes("@");
  }

  async function signInWithGoogle() {
    if (loading) return;

    setMessage("");
    setLoading("google");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getAuthCallbackUrl(),
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(null);
    }
  }

  async function adminAuth(username: string) {
    setLoading("admin");

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error || "Incorrect username or password.");
      setLoading(null);
      return;
    }

    window.location.assign("/dashboard");
  }

  async function emailAuth() {
    if (loading) return;

    setMessage("");

    const cleanIdentifier = identifier.trim();

    if (!cleanIdentifier || !password) {
      setMessage(
        mode === "login"
          ? "Enter your email or username and password."
          : "Enter your email and password."
      );
      return;
    }

    if (password.length < 6) {
      setMessage("Your password must be at least 6 characters.");
      return;
    }

    // A non-email identifier on the login screen is treated as the
    // private administrator username. The credentials are checked only
    // by the server and are never exposed in this component.
    if (mode === "login" && !looksLikeEmail(cleanIdentifier)) {
      await adminAuth(cleanIdentifier);
      return;
    }

    if (!looksLikeEmail(cleanIdentifier)) {
      setMessage("Enter a valid email address.");
      return;
    }

    setLoading("email");

    const result =
      mode === "signup"
        ? await supabase.auth.signUp({
            email: cleanIdentifier,
            password,
            options: {
              emailRedirectTo: getAuthCallbackUrl(),
            },
          })
        : await supabase.auth.signInWithPassword({
            email: cleanIdentifier,
            password,
          });

    if (result.error) {
      setMessage(result.error.message);
      setLoading(null);
      return;
    }

    if (mode === "signup") {
      setMessage("Account created. Check your email to confirm your account.");
      setLoading(null);
      return;
    }

    window.location.assign("/dashboard");
  }

  async function resetPassword() {
    if (loading) return;

    setMessage("");

    const cleanEmail = identifier.trim();

    if (!cleanEmail || !looksLikeEmail(cleanEmail)) {
      setMessage("Type your email in the box above first.");
      document.getElementById("login-identifier")?.focus();
      return;
    }

    setLoading("reset");

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: getResetPasswordUrl(),
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(
        "Password reset email sent. Check your inbox and spam folder."
      );
    }

    setLoading(null);
  }

  function switchMode() {
    if (loading) return;

    setMode((current) => (current === "login" ? "signup" : "login"));
    setMessage("");
    setIdentifier("");
    setPassword("");
    setShowPassword(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      void emailAuth();
    }
  }

  return (
    <section className="login-card premium-auth-card">
      <div className="login-card-head">
        <span>
          <Zap size={15} />
          Secure access
        </span>

        <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>

        <p>
          {mode === "login"
            ? "Access your Platinum Pulse workspace."
            : "Create your secure Platinum Pulse account."}
        </p>
      </div>

      <div className="oauth-grid">
        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={loading !== null}
        >
          {loading === "google" ? (
            <Loader2 className="spin" size={18} />
          ) : (
            <span className="google-mark" aria-hidden="true">
              G
            </span>
          )}
          Continue with Google
        </button>
      </div>

      <div className="divider">
        <span>or use your account</span>
      </div>

      <label className="field">
        <span>{mode === "login" ? "Email or username" : "Email address"}</span>

        <div>
          {mode === "login" && !looksLikeEmail(identifier) && identifier ? (
            <ShieldCheck size={17} />
          ) : (
            <Mail size={17} />
          )}

          <input
            id="login-identifier"
            type={mode === "signup" ? "email" : "text"}
            value={identifier}
            onChange={(event) => {
              setIdentifier(event.target.value);
              if (message) setMessage("");
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === "login"
                ? "you@company.com"
                : "you@company.com"
            }
            autoComplete={mode === "login" ? "username" : "email"}
          />
        </div>
      </label>

      <label className="field">
        <span>Password</span>

        <div>
          <LockKeyhole size={17} />

          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (message) setMessage("");
            }}
            onKeyDown={handleKeyDown}
            placeholder="Minimum 6 characters"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
          />

          <button
            className="eye"
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </label>

      {mode === "login" && (
        <button
          type="button"
          className="forgot-password"
          onClick={resetPassword}
          disabled={loading !== null}
        >
          {loading === "reset" ? (
            <>
              <Loader2 className="spin" size={13} />
              Sending reset email...
            </>
          ) : (
            "Forgot password?"
          )}
        </button>
      )}

      {message && <div className="auth-message">{message}</div>}

      <button
        type="button"
        className="login-primary"
        onClick={emailAuth}
        disabled={loading !== null}
      >
        {(loading === "email" || loading === "admin") && (
          <Loader2 className="spin" size={18} />
        )}

        {loading === "admin"
          ? "Opening secure panel..."
          : mode === "login"
            ? "Log in"
            : "Create account"}
      </button>

      <button
        type="button"
        className="switch-mode"
        onClick={switchMode}
        disabled={loading !== null}
      >
        {mode === "login"
          ? "Need an account? Create one"
          : "Already have an account? Log in"}
      </button>
    </section>
  );
}
