'use client';

import ReactMarkdown from 'react-markdown';
import { MessageBubble } from './MessageBubble';
import { BlockRenderer } from './BlockRenderer';
import { StreamingIndicator } from './StreamingIndicator';
import type { Message } from '@/types/ai-agent';

interface MessageRendererProps {
  messages: Message[];
  isStreaming?: boolean;
  streamingContent?: string;
  onSkillInvoke: (skillId: string, params: Record<string, unknown>) => Promise<void>;
  onAction: (actionId: string, params: Record<string, unknown>) => Promise<void>;
}

export function MessageRenderer({
  messages,
  isStreaming,
  streamingContent,
  onSkillInvoke,
  onAction,
}: MessageRendererProps) {
  return (
    <div className="space-y-6 py-4">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          role={message.type === 'user' ? 'user' : message.type === 'system' ? 'system' : 'assistant'}
          timestamp={message.createdAt}
        >
          {message.output ? (
            <BlockRenderer
              blocks={message.output.blocks}
              onSkillInvoke={onSkillInvoke}
              onAction={onAction}
            />
          ) : (
            <p style={{ color: 'var(--color-text-primary)' }}>{message.text}</p>
          )}
        </MessageBubble>
      ))}

      {isStreaming && (
        <MessageBubble role="assistant" isStreaming>
          {streamingContent ? (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{streamingContent}</ReactMarkdown>
            </div>
          ) : (
            <StreamingIndicator />
          )}
        </MessageBubble>
      )}
    </div>
  );
}
