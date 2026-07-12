import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function monthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function monthKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
    }

    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
      const offset = 5 - index;
      return monthStart(
        new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1))
      );
    });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("usage_monthly")
      .select("provider, period_start, request_count")
      .eq("user_id", user.id)
      .gte("period_start", monthKey(months[0]))
      .order("period_start", { ascending: true });

    if (error) throw error;

    const byMonth = new Map<string, { openai: number; claude: number }>();

    for (const row of data ?? []) {
      const key = String(row.period_start);
      const current = byMonth.get(key) ?? { openai: 0, claude: 0 };
      const provider = String(row.provider);

      if (provider === "openai" || provider === "claude") {
        current[provider] = Number(row.request_count ?? 0);
      }

      byMonth.set(key, current);
    }

    return NextResponse.json({
      history: months.map((month) => {
        const key = monthKey(month);
        const usage = byMonth.get(key) ?? { openai: 0, claude: 0 };

        return {
          periodStart: key,
          label: monthLabel(month),
          openai: usage.openai,
          claude: usage.claude,
        };
      }),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not load usage history.",
      },
      { status: 500 }
    );
  }
}
