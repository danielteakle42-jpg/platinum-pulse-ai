import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Composio } from "@composio/core";

export const runtime = "nodejs";

type UnknownRecord = Record<string, unknown>;

function normaliseToolkit(item: UnknownRecord): string {
  const toolkit = item.toolkit as UnknownRecord | string | undefined;
  const authConfig = item.authConfig as UnknownRecord | undefined;

  const value =
    item.toolkitSlug ||
    item.toolkit_slug ||
    (typeof toolkit === "string" ? toolkit : toolkit?.slug) ||
    item.appName ||
    item.app_name ||
    authConfig?.toolkitSlug ||
    authConfig?.toolkit_slug ||
    "";

  return String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isActive(item: UnknownRecord): boolean {
  const status = String(item.status ?? "").toUpperCase();
  return (
    status === "ACTIVE" ||
    status === "CONNECTED" ||
    status === "ENABLED" ||
    item.enabled === true
  );
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please sign in again." },
        { status: 401 }
      );
    }

    const apiKey = process.env.COMPOSIO_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "COMPOSIO_API_KEY is missing from .env.local." },
        { status: 500 }
      );
    }

    const composio = new Composio({ apiKey });
    const result = await composio.connectedAccounts.list({
      userIds: [user.id],
    });

    const items = ((result as unknown as { items?: UnknownRecord[] }).items ?? []).filter(
      isActive
    );

    const connectedToolkits = Array.from(
      new Set(items.map(normaliseToolkit).filter(Boolean))
    );

    return NextResponse.json({
      connectedToolkits,
      connections: items.map((item) => ({
        id: item.id ?? item.nanoid,
        status: item.status,
        toolkit: normaliseToolkit(item),
      })),
    });
  } catch (error) {
    console.error("Composio status error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not load your connected apps.",
      },
      { status: 500 }
    );
  }
}
