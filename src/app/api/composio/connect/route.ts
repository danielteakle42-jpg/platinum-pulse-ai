import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Composio } from "@composio/core";

export const runtime = "nodejs";

const AUTH_CONFIGS: Record<string, string | undefined> = {
  googlecalendar:
    process.env.COMPOSIO_GOOGLE_CALENDAR_AUTH_CONFIG_ID ||
    process.env.COMPOSIO_AUTH_CONFIG_ID,
  gmail: process.env.COMPOSIO_GMAIL_AUTH_CONFIG_ID,
  googledrive: process.env.COMPOSIO_GOOGLE_DRIVE_AUTH_CONFIG_ID,
  notion: process.env.COMPOSIO_NOTION_AUTH_CONFIG_ID,
  slack: process.env.COMPOSIO_SLACK_AUTH_CONFIG_ID,
  github: process.env.COMPOSIO_GITHUB_AUTH_CONFIG_ID,
};

function readableError(error: unknown): string {
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message) as {
        error?: { message?: string; suggested_fix?: string };
      };

      return (
        parsed.error?.message ||
        parsed.error?.suggested_fix ||
        "Composio could not start the connection."
      );
    } catch {
      return error.message;
    }
  }

  return "Composio could not start the connection.";
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please sign in again before connecting an app." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as { toolkit?: unknown };
    const toolkit = String(body.toolkit ?? "")
      .trim()
      .toLowerCase();

    if (!toolkit) {
      return NextResponse.json(
        { error: "Choose an app to connect." },
        { status: 400 }
      );
    }

    const apiKey = process.env.COMPOSIO_API_KEY;
    const authConfigId = AUTH_CONFIGS[toolkit];

    if (!apiKey) {
      return NextResponse.json(
        { error: "COMPOSIO_API_KEY is missing from .env.local." },
        { status: 500 }
      );
    }

    if (!authConfigId) {
      return NextResponse.json(
        {
          error:
            `This ${toolkit} connection is not configured yet. ` +
            "Create its Auth Config in Composio and add the matching ID to .env.local.",
        },
        { status: 400 }
      );
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      request.nextUrl.origin;

    const callbackUrl = `${siteUrl.replace(/\/$/, "")}/dashboard?composio=connected`;

    const composio = new Composio({ apiKey });

    // Composio-managed OAuth must use link(), not the retired initiate() flow.
    const connection = await composio.connectedAccounts.link(
      user.id,
      authConfigId,
      { callbackUrl }
    );

    if (!connection.redirectUrl) {
      throw new Error("Composio did not return a sign-in URL.");
    }

    return NextResponse.json({
      redirectUrl: connection.redirectUrl,
      connectionId: connection.id,
      toolkit,
    });
  } catch (error) {
    console.error("Composio connect error:", error);

    return NextResponse.json(
      { error: readableError(error) },
      { status: 500 }
    );
  }
}
