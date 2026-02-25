/**
 * OpenClaw Gateway Client
 *
 * Secure HTTP client for the OpenClaw Gateway.
 * Configure via OPENCLAW_GATEWAY_URL for remote/hosted deployments.
 */

const OPENCLAW_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789';
const OPENCLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';

export async function invokeOpenClawTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  if (!OPENCLAW_TOKEN) throw new Error('OPENCLAW_GATEWAY_TOKEN not set');

  const res = await fetch(`${OPENCLAW_GATEWAY_URL}/tools/invoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
    },
    body: JSON.stringify({ tool: toolName, args }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`OpenClaw ${res.status}: ${text}`);
  }
  return res.json();
}

export function isOpenClawAvailable(): boolean {
  return !!OPENCLAW_TOKEN;
}
