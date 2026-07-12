import { CheckCircle2, FileKey2, RefreshCw, Terminal } from "lucide-react";
import { getPublicSupabaseEnv, missingPublicSupabaseVariables } from "@/lib/env";
import { redirect } from "next/navigation";

export default function SetupPage() {
  if (getPublicSupabaseEnv().configured) {
    redirect("/");
  }

  const missing = missingPublicSupabaseVariables();

  return (
    <main className="setup-page">
      <section className="setup-card">
        <div className="setup-icon">
          <FileKey2 size={28} />
        </div>

        <span className="eyebrow">ONE-TIME LOCAL SETUP</span>
        <h1>Connect your Supabase project</h1>
        <p>
          The application is installed correctly. It only needs your public
          Supabase values before the login screen can open.
        </p>

        <div className="setup-warning">
          Missing: <b>{missing.join(", ")}</b>
        </div>

        <div className="setup-steps">
          <article>
            <CheckCircle2 size={18} />
            <div>
              <b>1. Create the environment file</b>
              <code>Copy-Item .env.example .env.local</code>
            </div>
          </article>

          <article>
            <FileKey2 size={18} />
            <div>
              <b>2. Add your Supabase public values</b>
              <pre>{`NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co\nNEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY`}</pre>
            </div>
          </article>

          <article>
            <Terminal size={18} />
            <div>
              <b>3. Save the file and restart Next.js</b>
              <code>npm run dev</code>
            </div>
          </article>
        </div>

        <div className="setup-note">
          <RefreshCw size={17} />
          The file must be named exactly <b>.env.local</b> and placed beside
          <b> package.json</b>, not in the outer Downloads folder.
        </div>
      </section>
    </main>
  );
}
