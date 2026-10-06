import type { LedgerEntry, StudentProfile } from "./types";

export interface CompassResponse {
  ok: boolean;
  message: string;
}

export async function askCompass(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  profile: StudentProfile,
  ledger: LedgerEntry[],
): Promise<CompassResponse> {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, profile, ledger }),
    });
    const payload = (await response.json()) as Partial<CompassResponse>;
    if (typeof payload.message === "string" && payload.message.trim()) {
      return { ok: Boolean(payload.ok), message: payload.message };
    }
    return {
      ok: false,
      message:
        "Ask Compass did not return a response. Recommendations, filters, and Ask Next are unaffected.",
    };
  } catch {
    return {
      ok: false,
      message:
        "Ask Compass could not be reached. The rest of the workspace still works.",
    };
  }
}
