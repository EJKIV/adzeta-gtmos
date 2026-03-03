'use client';

import { useState, useCallback, useRef } from 'react';
import { useSSEStream } from './use-sse-stream';
import type { StatusEvent, DeltaEvent, Block, SkillOutput, Message } from '@/types/ai-agent';

export type StreamPhase = StatusEvent['phase'] | 'idle';

export interface UseAIStreamOptions {
  url?: string;
  onMessage?: (message: Message) => void;
}

export interface UseAIStreamReturn {
  phase: StreamPhase;
  statusMessage: string;
  streamingContent: string;
  isStreaming: boolean;
  send: (sessionId: string, text: string) => Promise<void>;
  abort: () => void;
}

/**
 * Wraps useSSEStream to parse AI agent SSE events (status / delta / done).
 * Accumulates streaming text content and tracks the current phase.
 */
export function useAIStream({
  url = '/api/agent/command',
  onMessage,
}: UseAIStreamOptions = {}): UseAIStreamReturn {
  const [phase, setPhase] = useState<StreamPhase>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const contentRef = useRef('');

  const { stream, abort: sseAbort } = useSSEStream();

  const send = useCallback(async (sessionId: string, text: string) => {
    // Reset state
    setPhase('matching');
    setStatusMessage('');
    setStreamingContent('');
    contentRef.current = '';

    let skillOutput: SkillOutput | undefined;

    await stream(url, { sessionId, text }, {
      onEvent(event) {
        try {
          const data = JSON.parse(event.data);

          switch (event.event) {
            case 'status': {
              const status = data as StatusEvent;
              setPhase(status.phase);
              setStatusMessage(status.message);
              break;
            }

            case 'openclaw-delta':
            case 'delta': {
              const delta = data as DeltaEvent;
              contentRef.current += delta.content;
              setStreamingContent(contentRef.current);
              setPhase('streaming');
              break;
            }

            case 'skill-result': {
              skillOutput = data as SkillOutput;
              break;
            }

            case 'done': {
              setPhase('complete');
              // Build the final message from accumulated content
              if (onMessage) {
                const message: Message = {
                  id: crypto.randomUUID(),
                  sessionId: '',
                  type: 'assistant',
                  text: contentRef.current,
                  output: skillOutput,
                  createdAt: new Date().toISOString(),
                };
                onMessage(message);
              }
              // Reset streaming state
              setTimeout(() => {
                setPhase('idle');
                setStreamingContent('');
                setStatusMessage('');
              }, 300);
              break;
            }
          }
        } catch {
          // Non-JSON event, treat as raw text delta
          contentRef.current += event.data;
          setStreamingContent(contentRef.current);
        }
      },
      onDone() {
        setPhase('idle');
      },
      onError(error) {
        setPhase('error');
        setStatusMessage(error instanceof Error ? error.message : 'Stream error');
      },
    });
  }, [stream, url, onMessage]);

  const abort = useCallback(() => {
    sseAbort();
    setPhase('idle');
    setStreamingContent('');
    setStatusMessage('');
    contentRef.current = '';
  }, [sseAbort]);

  return {
    phase,
    statusMessage,
    streamingContent,
    isStreaming: phase !== 'idle' && phase !== 'complete' && phase !== 'error',
    send,
    abort,
  };
}
