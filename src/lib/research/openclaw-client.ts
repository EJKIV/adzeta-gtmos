/**
 * OpenClaw Gateway Client
 * 
 * Provides integration with OpenClaw agentic services for:
 * - Tool invocation (synchronous)
 * - Chat completion streaming (SSE-based)
 */

// Environment configuration
const OPENCLAW_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL;
const OPENCLAW_GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN;
const OPENCLAW_AGENT_ID = process.env.OPENCLAW_AGENT_ID;

// Default timeout for chat completions (60 seconds)
const DEFAULT_CHAT_TIMEOUT = 60000;

/**
 * Check if basic OpenClaw tool invocation is available
 * Requires gateway URL and token
 */
export function isOpenClawAvailable(): boolean {
  return !!OPENCLAW_GATEWAY_URL && !!OPENCLAW_GATEWAY_TOKEN;
}

/**
 * Check if OpenClaw chat streaming is available
 * Requires gateway URL, token, AND agent ID
 */
export function isOpenClawChatAvailable(): boolean {
  return !!OPENCLAW_GATEWAY_URL && !!OPENCLAW_GATEWAY_TOKEN && !!OPENCLAW_AGENT_ID;
}

interface OpenClawToolResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Invoke a tool through the OpenClaw gateway
 * @param tool - Tool identifier (e.g., "apollo.enrich", "apollo.search")
 * @param params - Tool parameters
 * @returns Tool response or error
 */
export async function invokeOpenClawTool<T = unknown>(
  tool: string,
  params: Record<string, unknown>
): Promise<OpenClawToolResponse<T>> {
  if (!isOpenClawAvailable()) {
    return {
      success: false,
      error: 'OpenClaw gateway not configured. Set OPENCLAW_GATEWAY_URL and OPENCLAW_GATEWAY_TOKEN',
    };
  }

  try {
    const response = await fetch(`${OPENCLAW_GATEWAY_URL}/v1/tools/invoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({
        tool,
        params,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `OpenClaw tool invocation failed: ${response.status} ${errorText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data: data as T,
    };
  } catch (error) {
    return {
      success: false,
      error: `OpenClaw tool invocation error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

interface ChatCompletionOptions {
  /** User message to send */
  message: string;
  /** Optional system prompt/role */
  system?: string;
  /** Session key for thread persistence (creates new if not provided) */
  sessionKey?: string;
  /** AbortSignal for cancellation/timeout (defaults to 60s timeout) */
  signal?: AbortSignal;
  /** Optional context/prior messages */
  context?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

interface ChatCompletionChunk {
  /** Content delta from this chunk */
  content: string;
  /** Whether this is the final chunk */
  done: boolean;
  /** Session key for thread persistence (returned in first chunk) */
  sessionKey?: string;
}

/**
 * Parse SSE (Server-Sent Events) chunk
 * Handles format: data: {...}\n\n or data: [DONE]
 */
function parseSSEChunk(chunk: string): string | null {
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith('data: ')) continue;
    
    const data = trimmed.slice(6); // Remove 'data: ' prefix
    
    if (data === '[DONE]') {
      return null; // End of stream
    }
    
    try {
      const parsed = JSON.parse(data);
      // Extract delta content from OpenAI-compatible format
      return parsed.choices?.[0]?.delta?.content || '';
    } catch {
      // Not valid JSON, return raw data
      return data;
    }
  }
  
  return '';
}

/**
 * Stream chat completion from OpenClaw agent
 * Async generator that yields content deltas as they arrive
 * 
 * @example
 * ```typescript
 * for await (const chunk of streamChatCompletion({ message: 'Hello' })) {
 *   if (!chunk.done) {
 *     process.stdout.write(chunk.content);
 *   }
 * }
 * ```
 */
export async function* streamChatCompletion(
  options: ChatCompletionOptions
): AsyncGenerator<ChatCompletionChunk> {
  if (!isOpenClawChatAvailable()) {
    throw new Error(
      'OpenClaw chat not configured. Set OPENCLAW_GATEWAY_URL, OPENCLAW_GATEWAY_TOKEN, and OPENCLAW_AGENT_ID'
    );
  }

  const { message, system, sessionKey, context } = options;
  
  // Create abort signal with default timeout if not provided
  const signal = options.signal || AbortSignal.timeout(DEFAULT_CHAT_TIMEOUT);

  // Build messages array
  const messages: Array<{ role: string; content: string }> = [
    ...(context || []),
    { role: 'user', content: message },
  ];

  const requestBody = {
    model: `openclaw:${OPENCLAW_AGENT_ID}`,
    messages: system 
      ? [{ role: 'system', content: system }, ...messages]
      : messages,
    stream: true,
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${OPENCLAW_GATEWAY_TOKEN}`,
    'Accept': 'text/event-stream',
  };

  // Add session key for thread persistence if provided
  if (sessionKey) {
    headers['x-openclaw-session-key'] = sessionKey;
  }

  let responseSessionKey: string | undefined;

  try {
    const response = await fetch(`${OPENCLAW_GATEWAY_URL}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenClaw chat completion failed: ${response.status} ${errorText}`);
    }

    // Extract session key from response headers for thread persistence
    responseSessionKey = response.headers.get('x-openclaw-session-key') || undefined;

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body not available for streaming');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let isFirstChunk = true;

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE events (delimited by double newline)
      const events = buffer.split('\n\n');
      buffer = events.pop() || ''; // Keep incomplete event in buffer

      for (const event of events) {
        const content = parseSSEChunk(event);
        
        if (content === null) {
          // [DONE] terminator
          yield { content: '', done: true };
          return;
        }

        if (content) {
          yield { 
            content, 
            done: false,
            ...(isFirstChunk && responseSessionKey ? { sessionKey: responseSessionKey } : {}),
          };
          isFirstChunk = false;
        }
      }
    }

    // Handle any remaining buffer content
    if (buffer.trim()) {
      const content = parseSSEChunk(buffer);
      if (content && content !== null) {
        yield { content, done: false };
      }
    }

    // Final done signal
    yield { content: '', done: true };

  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('OpenClaw chat completion timed out (60s)');
      }
      throw error;
    }
    throw new Error(`OpenClaw chat completion error: ${String(error)}`);
  }
}

/**
 * Convenience function for one-shot chat without streaming
 * Collects all chunks and returns complete response
 */
export async function chatWithAgent(
  message: string,
  options?: Omit<ChatCompletionOptions, 'message'>
): Promise<{ content: string; sessionKey?: string }> {
  const chunks: string[] = [];
  let sessionKey: string | undefined;

  for await (const chunk of streamChatCompletion({ message, ...options })) {
    if (chunk.done) break;
    chunks.push(chunk.content);
    if (chunk.sessionKey) {
      sessionKey = chunk.sessionKey;
    }
  }

  return {
    content: chunks.join(''),
    sessionKey,
  };
}
