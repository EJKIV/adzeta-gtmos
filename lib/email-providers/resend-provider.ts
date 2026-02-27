/**
 * Resend Email Provider
 *
 * Implements the EmailProvider interface using Resend's API.
 * Requires RESEND_API_KEY environment variable.
 */

import { Resend } from 'resend';
import type { EmailProvider } from '@/lib/email-processor';
import type { EmailJobData } from '@/lib/email-queue';

export class ResendEmailProvider implements EmailProvider {
  name = 'resend';
  private client: Resend;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.RESEND_API_KEY;
    if (!key) {
      throw new Error('RESEND_API_KEY is required for ResendEmailProvider');
    }
    this.client = new Resend(key);
  }

  async send(data: EmailJobData): Promise<{ messageId: string; response: unknown }> {
    const payload: Record<string, unknown> = {
      from: data.from,
      to: data.to,
      subject: data.subject,
    };

    if (data.html) {
      payload.html = data.html;
    } else if (data.text) {
      payload.text = data.text;
    }

    if (data.tags && data.tags.length > 0) {
      payload.tags = data.tags.map(t => ({ name: t, value: t }));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: result, error } = await this.client.emails.send(payload as any);

    if (error) {
      const err = new Error(error.message);
      // Tag permanent failures so the processor doesn't retry
      if (error.message?.includes('validation') || error.message?.includes('invalid')) {
        (err as Error & { permanent: boolean }).permanent = true;
      }
      throw err;
    }

    return {
      messageId: result?.id ?? `resend-${Date.now()}`,
      response: result,
    };
  }

  async validate(): Promise<{ valid: boolean; error?: string }> {
    try {
      // Resend doesn't have a dedicated validation endpoint,
      // so we check that the API key format is correct
      const key = process.env.RESEND_API_KEY;
      if (!key) return { valid: false, error: 'RESEND_API_KEY not set' };
      if (!key.startsWith('re_')) return { valid: false, error: 'Invalid API key format' };
      return { valid: true };
    } catch (err) {
      return {
        valid: false,
        error: err instanceof Error ? err.message : 'Unknown validation error',
      };
    }
  }

  async health(): Promise<{ healthy: boolean; latency: number }> {
    const start = Date.now();
    try {
      // Quick health check by listing domains (lightweight API call)
      await this.client.domains.list();
      return {
        healthy: true,
        latency: Date.now() - start,
      };
    } catch {
      return {
        healthy: false,
        latency: Date.now() - start,
      };
    }
  }
}
