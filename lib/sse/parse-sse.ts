/**
 * Client-side SSE (Server-Sent Events) buffer parser.
 *
 * Splits a raw text buffer on double-newline boundaries, extracts `event:`
 * and `data:` fields from each complete frame, and returns any leftover
 * bytes so the caller can prepend them to the next chunk.
 */

export interface SSEEvent {
  event: string;
  data: string;
}

export interface ParseResult {
  events: SSEEvent[];
  remaining: string;
}

/**
 * Parse a raw SSE buffer into discrete events.
 *
 * Each SSE frame is delimited by `\n\n`. A frame may contain:
 *   event: <name>\n
 *   data: <payload>\n
 *
 * If no `event:` line is present the event name defaults to `"message"`.
 * Multiple `data:` lines within one frame are joined with `\n`.
 */
export function parseSSEBuffer(buffer: string): ParseResult {
  const frames = buffer.split('\n\n');
  // Last element is either empty (buffer ended with \n\n) or an incomplete frame
  const remaining = frames.pop() || '';

  const events: SSEEvent[] = [];

  for (const frame of frames) {
    if (!frame.trim()) continue;

    let eventName = 'message';
    const dataLines: string[] = [];

    for (const line of frame.split('\n')) {
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart());
      }
      // Ignore comments (lines starting with ':') and unknown fields
    }

    if (dataLines.length > 0) {
      events.push({ event: eventName, data: dataLines.join('\n') });
    }
  }

  return { events, remaining };
}
