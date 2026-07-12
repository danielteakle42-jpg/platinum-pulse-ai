import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { demoReply, isDemoMode } from "@/lib/demo";
import { checkAndConsumeUsage } from "@/lib/billing/usage";

export const runtime = "nodejs";

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const SUPPORTED_IMAGES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const SUPPORTED_TEXT_FILES = new Set([
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/json",
]);

async function readRequest(request: NextRequest) {
  const contentType =
    request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();

    return {
      prompt: String(formData.get("prompt") ?? "").trim(),
      files: formData
        .getAll("files")
        .filter((item): item is File => item instanceof File),
    };
  }

  const body = await request.json();

  return {
    prompt: String(body.prompt ?? "").trim(),
    files: [] as File[],
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorised." },
        { status: 401 }
      );
    }

    const { prompt, files } = await readRequest(request);

    if (!prompt && files.length === 0) {
      return NextResponse.json(
        {
          error:
            "Enter a request or attach a file first.",
        },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        {
          error: `You can upload a maximum of ${MAX_FILES} files.`,
        },
        { status: 400 }
      );
    }

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            error: `${file.name} is larger than the 10 MB limit.`,
          },
          { status: 400 }
        );
      }
    }

    if (isDemoMode()) {
      return NextResponse.json({
        text: demoReply(
          "claude",
          [
            prompt || "Analyse the attached files.",
            files.length
              ? `Attached files: ${files
                  .map((file) => file.name)
                  .join(", ")}`
              : "",
          ]
            .filter(Boolean)
            .join("\n\n")
        ),
        demo: true,
      });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error:
            "ANTHROPIC_API_KEY is missing from .env.local.",
        },
        { status: 500 }
      );
    }

    const usage = await checkAndConsumeUsage(user.id, "claude");
    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: `You have used all ${usage.limit} ${usage.plan} plan requests for this month. Upgrade your plan to continue.`,
          code: "USAGE_LIMIT_REACHED",
          usage,
        },
        { status: 402 }
      );
    }

    const content: any[] = [
      {
        type: "text",
        text:
          prompt ||
          "Analyse the attached files and explain the important information clearly.",
      },
    ];

    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");

      if (SUPPORTED_IMAGES.has(file.type)) {
        content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: file.type,
            data: base64,
          },
        });
        continue;
      }

      if (file.type === "application/pdf") {
        content.push({
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: base64,
          },
          title: file.name,
        });
        continue;
      }

      if (
        SUPPORTED_TEXT_FILES.has(file.type) ||
        /\.(txt|md|csv|json)$/i.test(file.name)
      ) {
        const text = Buffer.from(buffer).toString("utf8");

        content.push({
          type: "text",
          text: [
            `Attached file: ${file.name}`,
            "----- FILE CONTENT -----",
            text,
            "----- END FILE -----",
          ].join("\n"),
        });
        continue;
      }

      return NextResponse.json(
        {
          error:
            `${file.name} is not supported by this Claude module yet. ` +
            "Use PDF, TXT, MD, CSV, JSON, JPG, PNG, GIF or WebP.",
        },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await anthropic.messages.create({
      model:
        process.env.ANTHROPIC_MODEL ||
        "claude-sonnet-4-5",
      max_tokens: 3000,
      system: `
You are the Claude document assistant inside Platinum Pulse AI Workspace.

Help users analyse files, summarise documents, create reports,
write proposals, improve wording and explain complex information.

Give clear, careful and well-structured answers.
Do not assume the user works in a particular industry.
      `.trim(),
      messages: [
        {
          role: "user",
          content,
        },
      ],
    });

    const text = message.content
      .filter(
        (
          block
        ): block is Anthropic.Messages.TextBlock =>
          block.type === "text"
      )
      .map((block) => block.text)
      .join("\n");

    return NextResponse.json({ text, usage });
  } catch (error) {
    console.error("Claude route error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Claude request failed.",
      },
      { status: 500 }
    );
  }
}
