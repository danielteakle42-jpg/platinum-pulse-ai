import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAndConsumeUsage } from "@/lib/billing/usage";
import { isDemoMode } from "@/lib/demo";

export const runtime = "nodejs";

const ALLOWED_SIZES = new Set(["1024x1024", "1536x1024", "1024x1536"]);

function demoImage(prompt: string) {
  const safePrompt = prompt.replace(/[<>&'\"]/g, "").slice(0, 90);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#02050a"/>
          <stop offset="0.55" stop-color="#08243c"/>
          <stop offset="1" stop-color="#0878ff"/>
        </linearGradient>
      </defs>
      <rect width="1024" height="1024" fill="url(#g)"/>
      <circle cx="512" cy="390" r="170" fill="none" stroke="#24c8ff" stroke-width="16" opacity="0.75"/>
      <text x="512" y="640" text-anchor="middle" fill="#edf8ff" font-size="48" font-family="Arial">Platinum Pulse AI</text>
      <text x="512" y="710" text-anchor="middle" fill="#9bb3c5" font-size="25" font-family="Arial">${safePrompt || "Demo image"}</text>
    </svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
    }

    const body = await request.json();
    const prompt = String(body.prompt ?? "").trim();
    const requestedSize = String(body.size ?? "1024x1024");
    const size = ALLOWED_SIZES.has(requestedSize)
      ? requestedSize
      : "1024x1024";

    if (!prompt) {
      return NextResponse.json(
        { error: "Describe the image you want to create." },
        { status: 400 }
      );
    }

    const usage = await checkAndConsumeUsage(user.id, "openai");

    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: `Your OpenAI monthly limit of ${usage.limit} requests has been reached.`,
        },
        { status: 402 }
      );
    }

    if (isDemoMode()) {
      return NextResponse.json({
        image: demoImage(prompt),
        demo: true,
        usage,
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is missing." },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const result = await openai.images.generate({
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
      prompt,
      size: size as "1024x1024" | "1536x1024" | "1024x1536",
    });

    const first = result.data?.[0];
    const image = first?.b64_json
      ? `data:image/png;base64,${first.b64_json}`
      : first?.url;

    if (!image) {
      throw new Error("OpenAI did not return an image.");
    }

    return NextResponse.json({ image, usage });
  } catch (error) {
    console.error("Image generation error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Image generation failed.",
      },
      { status: 500 }
    );
  }
}
