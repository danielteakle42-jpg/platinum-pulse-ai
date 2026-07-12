import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalisePlan, PLANS } from "@/lib/billing/plans";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("plan, subscription_status, current_period_end, stripe_customer_id, referral_code")
      .eq("id", user.id)
      .maybeSingle();

    const periodStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1))
      .toISOString().slice(0, 10);

    const { data: usage } = await admin
      .from("usage_monthly")
      .select("provider, request_count")
      .eq("user_id", user.id)
      .eq("period_start", periodStart);

    const plan = normalisePlan(profile?.plan);
    const usageByProvider = Object.fromEntries(
      (usage ?? []).map((row) => [row.provider, Number(row.request_count ?? 0)])
    );

    return NextResponse.json({
      plan,
      planDetails: PLANS[plan],
      subscriptionStatus: profile?.subscription_status ?? "free",
      currentPeriodEnd: profile?.current_period_end ?? null,
      hasStripeCustomer: Boolean(profile?.stripe_customer_id),
      referralCode: profile?.referral_code ?? null,
      usage: {
        openai: usageByProvider.openai ?? 0,
        claude: usageByProvider.claude ?? 0,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load billing status." },
      { status: 500 }
    );
  }
}
