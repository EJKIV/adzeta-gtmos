'use client';

import { LoginGate } from '@/app/components/login-gate';
import { useAuth } from '@/app/components/auth-provider';
import { ChatLayout } from '@/app/components/chat/chat-layout';
import { ChatThread } from '@/app/components/chat/chat-thread';
import { ChatInput } from '@/app/components/chat/chat-input';
import { QuickSuggestions } from '@/app/components/chat/quick-suggestions';
import { EmptyState } from '@/app/components/chat/empty-state';
import { SessionBar } from '@/app/components/chat/session-bar';
import { RightSidebar } from '@/app/components/sidebar/right-sidebar';
import { useChatEngine } from '@/app/hooks/use-chat-engine';

export default function Home() {
  return (
    <LoginGate>
      <DashboardContent />
    </LoginGate>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const engine = useChatEngine(user?.id);

  const hasMessages = engine.thread.length > 0 || engine.transitioning;

  return (
    <ChatLayout
      hasMessages={hasMessages}
      transitioning={engine.transitioning}
      sessionBar={
        <SessionBar
          sessions={engine.sessions}
          activeSessionId={engine.activeSessionId}
          onNewChat={engine.handleNewChat}
          onSwitchSession={engine.handleSwitchSession}
          onArchiveSession={engine.handleArchiveSession}
          systemHealthy={!engine.sessionError}
        />
      }
      thread={
        <ChatThread
          entries={engine.thread}
          isProcessing={engine.isProcessing}
          isLoading={engine.isLoadingSession}
          onFollowUp={engine.handleCommand}
          statusMessage={engine.statusMessage}
          feedbackMap={engine.feedbackMap}
          onFeedback={engine.handleFeedback}
          sessionId={engine.activeSessionId}
        />
      }
      input={
        <>
          {engine.thread.length > 0 && !engine.isProcessing && (
            <QuickSuggestions onCommand={engine.handleCommand} />
          )}
          <ChatInput onCommand={engine.handleCommand} isProcessing={engine.isProcessing} />
        </>
      }
      emptyState={
        <EmptyState onCommand={engine.handleCommand}>
          <ChatInput onCommand={engine.handleCommand} isProcessing={engine.isProcessing} borderless />
        </EmptyState>
      }
      sidebar={
        <RightSidebar onAction={engine.handleCommand} />
      }
    />
  );
}
