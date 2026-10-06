import Groq from "groq-sdk";
import { buildCounsellingContext } from "@/lib/counselling-context";
import { getCourses } from "@/lib/courses";
import { GROQ_MODEL } from "@/lib/groq-model";
import { sanitizeProfile } from "@/lib/profile";
import type { LedgerEntry } from "@/lib/types";

const SYSTEM_PROMPT = `You are a counselling assistant. Answer strictly from the structured student and course information supplied to you. Never invent universities, courses, tuition fees, eligibility requirements, rankings or other factual course information. If the supplied information is insufficient, say that it is not available.

Do not calculate recommendation scores, eligibility decisions, tuition, or rankings. Use only the numbers and statuses in the structured context. When you compare courses, attribute the difference to the supplied score breakdown. Keep the answer concise enough to use in a live counselling call.`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function isLedger(value: unknown): value is LedgerEntry[] {
  return Array.isArray(value);
}

function readMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is ChatMessage => {
      if (!item || typeof item !== "object") return false;
      const message = item as ChatMessage;
      return (
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string"
      );
    })
    .slice(-8)
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, 2000),
    }));
}

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        ok: false,
        message:
          "Ask Compass needs GROQ_API_KEY in the server environment. Add it to .env.local and restart. Ranking, filters, comparison, and Ask Next keep working without it.",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, message: "Ask Compass could not read that request." },
      { status: 400 },
    );
  }

  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const messages = readMessages(record.messages);
  if (!messages.some((message) => message.role === "user")) {
    return Response.json(
      { ok: false, message: "Ask a question for Compass to answer." },
      { status: 400 },
    );
  }

  const profile = sanitizeProfile(record.profile);
  const ledger = isLedger(record.ledger) ? record.ledger.slice(-12) : [];
  const latestUser = [...messages].reverse().find((message) => message.role === "user");
  const context = buildCounsellingContext(
    profile,
    getCourses(),
    ledger,
    latestUser?.content ?? "",
  );

  try {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.2,
      max_completion_tokens: 1400,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "system",
          content: `Structured context:\n${JSON.stringify(context)}`,
        },
        ...messages,
      ],
    });
    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      return Response.json(
        {
          ok: false,
          message:
            "Ask Compass returned an empty response. The recommendation workspace is unaffected.",
        },
        { status: 502 },
      );
    }
    return Response.json({ ok: true, message: content });
  } catch {
    return Response.json(
      {
        ok: false,
        message:
          "Ask Compass could not reach Groq. Check the API key and try again. Recommendations, filters, and Ask Next still work.",
      },
      { status: 502 },
    );
  }
}
