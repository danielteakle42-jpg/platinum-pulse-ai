export function isDemoMode() {
  return process.env.DEMO_MODE !== "false";
}

export function demoReply(tool: string, prompt: string) {
  const clipped = prompt.length > 170 ? `${prompt.slice(0, 170)}…` : prompt;

  const replies: Record<string, string> = {
    openai:
      `Demo business response\n\nYou asked: “${clipped}”\n\nRecommended structure:\n1. Define one measurable goal.\n2. Choose the three highest-impact actions.\n3. Assign an owner and deadline.\n4. Review results weekly.\n\nAdd your OpenAI API key for live responses.`,
    claude:
      `Demo document response\n\nI would structure “${clipped}” as:\n\n• Purpose\n• Scope\n• Responsibilities\n• Step-by-step process\n• Quality checks\n• Review date\n\nAdd your Anthropic API key for live responses.`,
    automation:
      `Demo automation completed.\n\nWorkflow: ${clipped}\n\nAdd your n8n production webhook URL to trigger a real workflow.`
  };

  return replies[tool] ?? "Demo response";
}
