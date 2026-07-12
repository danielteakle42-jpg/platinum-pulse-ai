import OpenAI from "openai";
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

type ResponseContentItem =
  | {
      type: "input_text";
      text: string;
    }
  | {
      type: "input_image";
      image_url: string;
      detail: "auto";
    }
  | {
      type: "input_file";
      filename: string;
      file_data: string;
    };

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

function getMimeType(file: File) {
  if (file.type) return file.type;

  const extension =
    file.name.split(".").pop()?.toLowerCase() ?? "";

  const types: Record<string, string> = {
    pdf: "application/pdf",
    txt: "text/plain",
    md: "text/markdown",
    csv: "text/csv",
    json: "application/json",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };

  return types[extension] ?? "application/octet-stream";
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
            "Enter a prompt or attach a file first.",
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
          "openai",
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

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY is missing from .env.local.",
        },
        { status: 500 }
      );
    }

    const usage = await checkAndConsumeUsage(user.id, "openai");
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

    const content: ResponseContentItem[] = [
      {
        type: "input_text",
        text:
          prompt ||
          "Analyse the attached files and explain the important information clearly.",
      },
    ];

    for (const file of files) {
      const mimeType = getMimeType(file);
      const base64 = Buffer.from(
        await file.arrayBuffer()
      ).toString("base64");

      if (SUPPORTED_IMAGES.has(mimeType)) {
        content.push({
          type: "input_image",
          image_url: `data:${mimeType};base64,${base64}`,
          detail: "auto",
        });
      } else {
        content.push({
          type: "input_file",
          filename: file.name,
          file_data: `data:${mimeType};base64,${base64}`,
        });
      }
    }

    const openai = new OpenAI({ apiKey });

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5",
      instructions: `
You are the OpenAI assistant inside Platinum Pulse AI Workspace.

Help users with planning, coding, research, business,
productivity, writing, analysis, decision-making and uploaded files.

Give clear, practical and structured answers.
Do not assume the user works in a specific industry.
      `.trim(),
      input: [
        {
          role: "user",
          content,
        },
      ],
    });

    return NextResponse.json({
      text: response.output_text,
      usage,
    });
  } catch (error) {
    console.error("OpenAI route error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "OpenAI request failed.",
      },
      { status: 500 }
    );
  }
}
