import { redirect } from "next/navigation";
import LoginPanel from "@/components/LoginPanel";
import { getPublicSupabaseEnv } from "@/lib/env";

export default function LoginPage() {
  if (!getPublicSupabaseEnv().configured) {
    redirect("/setup");
  }

  return (
    <main className="login-page premium-login">
      <div className="ambient-orb orb-one" />
      <div className="ambient-orb orb-two" />
      <div className="ambient-orb orb-three" />

      <section className="login-showcase">
        <div className="showcase-logo-wrap">
          <img
            src="/platinum-pulse-logo.jpeg"
            alt="Platinum Pulse AI"
            className="showcase-logo"
          />
        </div>

        <div className="showcase-copy">
          <span className="showcase-kicker">PLATINUM PULSE AI</span>
          <h1>One command centre for smarter work.</h1>
          <p>
            OpenAI, Claude, private chats, connected apps, image generation
            and billing inside one premium workspace.
          </p>
        </div>

        <div className="showcase-grid">
          <article>
            <span>01</span>
            <div>
              <b>Unified AI chat</b>
              <small>Switch between OpenAI and Claude.</small>
            </div>
          </article>
          <article>
            <span>02</span>
            <div>
              <b>Private conversations</b>
              <small>Password-protected incognito sessions.</small>
            </div>
          </article>
          <article>
            <span>03</span>
            <div>
              <b>Connected workspace</b>
              <small>Link useful apps securely through Composio.</small>
            </div>
          </article>
        </div>
      </section>

      <section className="login-panel-wrap">
        <div className="login-panel-badge">
          <img src="/platinum-pulse-logo.jpeg" alt="" />
          <span>SECURE MEMBER ACCESS</span>
        </div>
        <LoginPanel />
      </section>
    </main>
  );
}
