export type PlanKey = "free" | "pro" | "business";
export type ProviderKey = "openai" | "claude";

export const PLANS = {
  free: {
    name: "Free",
    monthlyPrice: 0,
    monthlyRequests: 25,
    integrations: 1,
    fileUploads: true,
    teamSeats: 1,
  },
  pro: {
    name: "Pro",
    monthlyPrice: 14.99,
    monthlyRequests: 750,
    integrations: 10,
    fileUploads: true,
    teamSeats: 1,
  },
  business: {
    name: "Business",
    monthlyPrice: 39.99,
    monthlyRequests: 3000,
    integrations: 50,
    fileUploads: true,
    teamSeats: 5,
  },
} as const;

export function normalisePlan(value: unknown): PlanKey {
  return value === "pro" || value === "business" ? value : "free";
}

export function priceIdForPlan(plan: PlanKey) {
  if (plan === "pro") return process.env.STRIPE_PRO_PRICE_ID;
  if (plan === "business") return process.env.STRIPE_BUSINESS_PRICE_ID;
  return undefined;
}
