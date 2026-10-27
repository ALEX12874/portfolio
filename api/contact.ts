/**
 * POST /api/contact — Vercel serverless function (Node runtime).
 * Thin wrapper: the logic, validation and providers live in server/contact.ts.
 * Keys come from server-side env vars (RESEND_API_KEY, WEB3FORMS_KEY); they
 * never reach the browser.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { MAX_BODY_BYTES, handleContact } from "../server/contact.js";

type VercelRequest = IncomingMessage & { body?: unknown };

/** Read the raw body ourselves (capped), unless the platform already parsed it. */
async function readBody(req: VercelRequest): Promise<{ body: unknown; bytes: number }> {
  const declared = Number(req.headers["content-length"]) || 0;
  // Vercel parses JSON bodies lazily, and the getter throws on invalid JSON
  let parsed: unknown;
  try {
    parsed = req.body;
  } catch {
    return { body: "{invalid", bytes: declared };
  }
  if (parsed !== undefined) {
    const body = parsed;
    const bytes = declared || Buffer.byteLength(typeof body === "string" ? body : JSON.stringify(body ?? ""));
    return { body, bytes };
  }
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string);
    bytes += buf.length;
    // stop reading early: anything this big is rejected anyway
    if (bytes > MAX_BODY_BYTES) return { body: "", bytes };
    chunks.push(buf);
  }
  return { body: Buffer.concat(chunks).toString("utf8"), bytes };
}

function clientIp(req: VercelRequest): string {
  const fwd = req.headers["x-forwarded-for"];
  const first = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(",")[0]?.trim();
  const real = req.headers["x-real-ip"];
  return first || (Array.isArray(real) ? real[0] : real) || req.socket?.remoteAddress || "unknown";
}

export default async function handler(req: VercelRequest, res: ServerResponse) {
  let status = 500;
  let payload: Record<string, unknown> = { ok: false, error: "server_error" };
  try {
    const { body, bytes } = await readBody(req);
    const referer = req.headers.referer || req.headers.origin;
    const result = await handleContact(
      {
        method: req.method ?? "GET",
        body,
        bodyBytes: bytes,
        ip: clientIp(req),
        page: typeof referer === "string" ? referer : undefined,
      },
      {
        env: { RESEND_API_KEY: process.env.RESEND_API_KEY, WEB3FORMS_KEY: process.env.WEB3FORMS_KEY },
        fetch,
        log: (line) => console.log(line),
      }
    );
    status = result.status;
    payload = result.body;
  } catch {
    console.log("[contact] provider=none status=server_error");
  }
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (status === 405) res.setHeader("Allow", "POST");
  res.end(JSON.stringify(payload));
}
