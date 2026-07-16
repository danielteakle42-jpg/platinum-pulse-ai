export function isDemoMode() {
  return process.env.DEMO_MODE?.trim().toLowerCase() === "true";
}

export function demoReply(tool: string, prompt: string) {
  const clipped =
    prompt.length > 170
      ? `${prompt.slice(0, 170)}…`
      : prompt;

  const replies: Record<string, string> = {
    openai: `Demo business response

You asked: "${clipped}"

Recommended structure:
1. Define one measurable goal.
2. Choose the three highest-impact actions.
3. Assign an owner and deadline.
4. Review results weekly.

Add your OpenAI API key for live responses.`,

    claude: `Demo document response

I would structure "${clipped}" as:

• Purpose
• Scope
• Responsibilities
• Step-by-step process
• Quality checks
• Review date

Add your Anthropic API key for live responses.`,

    automation: `Demo automation completed.

Workflow: ${clipped}

Add your production webhook URL to trigger a real workflow.`,
  };

  return replies[tool] ?? "Demo response";
}