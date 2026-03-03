'use client';

import { useState, useCallback } from 'react';
import { SuggestionToast, SuggestionToastContainer, SuggestionData } from './suggestion-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * SuggestionToast Demo
 * 
 * Demonstrates:
 * - Auto-dismiss functionality with progress bar
 * - Hover pause behavior
 * - Accept/Dismiss actions
 * - Animation states
 * - Multiple toast stacking
 */

const SAMPLE_SUGGESTIONS: SuggestionData[] = [
  {
    id: 'demo-1',
    text: 'Create a follow-up email sequence for cold leads?',
    confidence: 0.92,
    type: 'sequence',
  },
  {
    id: 'demo-2',
    text: 'Schedule a campaign review for next week?',
    confidence: 0.78,
    type: 'review',
  },
  {
    id: 'demo-3',
    text: 'Update target audience based on recent engagement data?',
    confidence: 0.65,
    type: 'optimization',
  },
];

export function SuggestionToastDemo() {
  const [activeSuggestions, setActiveSuggestions] = useState<SuggestionData[]>([]);
  const [eventLog, setEventLog] = useState<string[]>([]);

  const addEvent = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setEventLog((prev) => [`[${timestamp}] ${message}`, ...prev].slice(0, 20));
  }, []);

  const handleAddSuggestion = useCallback((index: number) => {
    const suggestion = SAMPLE_SUGGESTIONS[index];
    
    // Don't add duplicates
    setActiveSuggestions((prev) => {
      if (prev.some((s) => s.id === suggestion.id)) {
        addEvent(`Suggestion ${suggestion.id} already active`);
        return prev;
      }
      addEvent(`Added suggestion: ${suggestion.text.slice(0, 30)}...`);
      return [...prev, suggestion];
    });
  }, [addEvent]);

  const handleAccepted = useCallback((suggestion: SuggestionData) => {
    addEvent(`ACCEPTED: ${suggestion.text.slice(0, 40)}...`);
    setActiveSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
  }, [addEvent]);

  const handleDismissed = useCallback((suggestion: SuggestionData) => {
    addEvent(`DISMISSED: ${suggestion.text.slice(0, 40)}...`);
    setActiveSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
  }, [addEvent]);

  const handleClearAll = useCallback(() => {
    addEvent('Cleared all suggestions');
    setActiveSuggestions([]);
  }, [addEvent]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Suggestion Toast Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Click to add suggestion toasts. They auto-dismiss after 10s unless hovered.
          </p>
          
          <div className="flex flex-wrap gap-2">
            {SAMPLE_SUGGESTIONS.map((suggestion, index) => (
              <Button
                key={suggestion.id}
                variant="outline"
                size="sm"
                onClick={() => handleAddSuggestion(index)}
              >
                Add {suggestion.type}
              </Button>
            ))}
            <Button variant="destructive" size="sm" onClick={handleClearAll}>
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Toast Container Demo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Toasts ({activeSuggestions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {activeSuggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No active suggestions. Add one above!
            </p>
          ) : (
            <div className="space-y-3">
              {activeSuggestions.map((suggestion) => (
                <SuggestionToast
                  key={suggestion.id}
                  data={suggestion}
                  onAccepted={handleAccepted}
                  onDismissed={handleDismissed}
                  position="inline"
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Event Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-md p-3 h-48 overflow-y-auto font-mono text-xs">
            {eventLog.length === 0 ? (
              <span className="text-muted-foreground">No events yet...</span>
            ) : (
              eventLog.map((event, i) => (
                <div key={i} className="py-0.5">
                  {event}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fixed Position Demo (Desktop) */}
      {activeSuggestions.length > 0 && (
        <div className="hidden">
          {activeSuggestions.slice(0, 1).map((suggestion) => (
            <SuggestionToast
              key={`fixed-${suggestion.id}`}
              data={suggestion}
              onAccepted={handleAccepted}
              onDismissed={handleDismissed}
              position="bottom-right"
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Standalone single toast demo
export function SingleToastDemo() {
  const [show, setShow] = useState(false);

  const suggestion: SuggestionData = {
    id: 'single-demo',
    text: 'Generate weekly performance report?',
    confidence: 0.85,
    type: 'report',
  };

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Single Toast Demo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button onClick={() => setShow(true)} disabled={show}>
            Show Toast
          </Button>

          {show && (
            <SuggestionToast
              data={suggestion}
              onAccepted={() => {
                console.log('Accepted!');
                setShow(false);
              }}
              onDismissed={() => {
                console.log('Dismissed!');
                setShow(false);
              }}
              position="inline"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default SuggestionToastDemo;
