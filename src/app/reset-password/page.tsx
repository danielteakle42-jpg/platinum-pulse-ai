"use client";

import {
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  async function updatePassword() {
    if (loading) return;

    setMessage("");

    if (!password || !confirmPassword) {
      setMessage("Enter and confirm your new password.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage("Password updated successfully. Redirecting to login...");

    setTimeout(async () => {
      await supabase.auth.signOut();
      window.location.assign("/login");
    }, 1500);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      void updatePassword();
    }
  }

  return (
    <main className="login-page premium-login">
      <div className="ambient-orb orb-one" />
      <div className="ambient-orb orb-two" />
      <div className="ambient-orb orb-three" />

      <section className="login-card premium-auth-card">
        <div className="login-card-head">
          <span>
            <ShieldCheck size={15} />
            Secure account recovery
          </span>

          <h2>Set a new password</h2>

          <p>
            Choose a new password for your Platinum Pulse account.
          </p>
        </div>

        <label className="field">
          <span>New password</span>

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
              autoComplete="new-password"
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

        <label className="field">
          <span>Confirm password</span>

          <div>
            <LockKeyhole size={17} />

            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                if (message) setMessage("");
              }}
              onKeyDown={handleKeyDown}
              placeholder="Repeat your new password"
              autoComplete="new-password"
            />

            <button
              className="eye"
              type="button"
              onClick={() =>
                setShowConfirmPassword((current) => !current)
              }
              aria-label={
                showConfirmPassword
                  ? "Hide confirmation password"
                  : "Show confirmation password"
              }
            >
              {showConfirmPassword ? (
                <EyeOff size={17} />
              ) : (
                <Eye size={17} />
              )}
            </button>
          </div>
        </label>

        {message && <div className="auth-message">{message}</div>}

        <button
          type="button"
          className="login-primary"
          onClick={updatePassword}
          disabled={loading}
        >
          {loading && <Loader2 className="spin" size={18} />}
          {loading ? "Updating password..." : "Update password"}
        </button>

        <button
          type="button"
          className="switch-mode"
          onClick={() => window.location.assign("/login")}
          disabled={loading}
        >
          Return to login
        </button>
      </section>
    </main>
  );
}