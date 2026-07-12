import { createAdminClient } from "@/lib/supabase/admin";
import { normalisePlan, PLANS, ProviderKey } from "@/lib/billing/plans";

function currentPeriodStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

export async function checkAndConsumeUsage(
  userId: string,
  provider: ProviderKey
) {
  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("plan, subscription_status")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) throw profileError;

  const plan = normalisePlan(profile?.plan);
  const subscriptionStatus = String(profile?.subscription_status ?? "free");
  const paidActive = ["active", "trialing"].includes(subscriptionStatus);
  const effectivePlan = plan === "free" || paidActive ? plan : "free";
  const limit = PLANS[effectivePlan].monthlyRequests;
  const periodStart = currentPeriodStart();

  const { data: usage, error: usageError } = await admin
    .from("usage_monthly")
    .select("request_count")
    .eq("user_id", userId)
    .eq("provider", provider)
    .eq("period_start", periodStart)
    .maybeSingle();

  if (usageError) throw usageError;

  const used = Number(usage?.request_count ?? 0);
  if (used >= limit) {
    return {
      allowed: false as const,
      plan: effectivePlan,
      used,
      limit,
    };
  }

  const { error: upsertError } = await admin.from("usage_monthly").upsert(
    {
      user_id: userId,
      provider,
      period_start: periodStart,
      request_count: used + 1,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider,period_start" }
  );

  if (upsertError) throw upsertError;

  return {
    allowed: true as const,
    plan: effectivePlan,
    used: used + 1,
    limit,
  };
}
