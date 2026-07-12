import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
    }

    const body = await request.json();
    const password = String(body.password ?? "");

    if (!password) {
      return NextResponse.json(
        { error: "Enter your account password." },
        { status: 400 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      return NextResponse.json(
        { error: "Supabase authentication is not configured." },
        { status: 500 }
      );
    }

    // Use an isolated Supabase client so password verification does not replace
    // the user's existing browser session. The password is never stored.
    const verifier = createSupabaseClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const { error } = await verifier.auth.signInWithPassword({
      email: user.email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: "That password is incorrect." },
        { status: 401 }
      );
    }

    await verifier.auth.signOut();

    return NextResponse.json({ unlocked: true });
  } catch (error) {
    console.error("Incognito unlock error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not unlock incognito mode.",
      },
      { status: 500 }
    );
  }
}
