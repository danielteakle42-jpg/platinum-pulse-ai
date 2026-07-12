import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const admins = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    const cookieStore = await cookies();
    const credentialAdmin = verifyAdminToken(cookieStore.get(ADMIN_COOKIE)?.value);
    const emailAdmin = Boolean(user.email && admins.includes(user.email.toLowerCase()));
    if (!credentialAdmin && !emailAdmin) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data: profiles, count } = await admin
      .from("profiles")
      .select("id, email, plan, subscription_status, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(50);

    const summary = (profiles ?? []).reduce(
      (acc, profile) => {
        const plan = String(profile.plan ?? "free");
        acc[plan] = (acc[plan] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({ totalUsers: count ?? 0, planSummary: summary, users: profiles ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load admin overview." },
      { status: 500 }
    );
  }
}
