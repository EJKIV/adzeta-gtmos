'use client';

/**
 * Command Input Component
 * 
 * Natural language input with autocomplete suggestions
 * for the research and outreach platform
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, Zap } from 'lucide-react';
// Stub: original module was removed. This component is unused legacy code.
function getCommandSuggestions(_input: string): string[] { return []; }

interface CommandInputProps {
  onSubmit: (command: string) => Promise<void>;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

export function CommandInput({
  onSubmit,
  isLoading = false,
  placeholder = 'Type a command like "research 50 VP Sales in fintech"...',
  className = '',
}: CommandInputProps) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update suggestions when input changes
  useEffect(() => {
    if (input.trim().length > 2) {
      const newSuggestions = getCommandSuggestions(input);
      setSuggestions(newSuggestions);
      setShowSuggestions(newSuggestions.length > 0);
    } else {
      setShowSuggestions(false);
    }
    setSelectedIndex(-1);
  }, [input]);

  // Handle click outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      
      if (!input.trim() || isLoading) return;
      
      const command = input.trim();
      setInput('');
      setSuggestions([]);
      setShowSuggestions(false);
      
      await onSubmit(command);
    },
    [input, isLoading, onSubmit]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => 
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && suggestions[selectedIndex]) {
            setInput(suggestions[selectedIndex]);
            setShowSuggestions(false);
            setSelectedIndex(-1);
          } else {
            handleSubmit();
          }
          break;
        case 'Escape':
          setShowSuggestions(false);
          break;
        case 'Tab':
          if (suggestions.length > 0 && selectedIndex >= 0) {
            e.preventDefault();
            setInput(suggestions[selectedIndex]);
            setShowSuggestions(false);
            setSelectedIndex(-1);
          }
          break;
      }
    },
    [handleSubmit, selectedIndex, suggestions]
  );

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setInput(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Command Input Form */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          {/* Command Icon */}
          <div className="absolute left-4 flex items-center space-x-2 pointer-events-none">
            <Sparkles className="w-4 h-4 text-violet-400" />
          </div>

          {/* Input Field */}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            className="w-full pl-12 pr-14 py-4 bg-slate-900/50 border border-slate-700 
                       rounded-xl text-slate-100 placeholder:text-slate-500
                       focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200"
          />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-3 p-2 bg-violet-600 hover:bg-violet-500 
                       disabled:bg-slate-700 disabled:cursor-not-allowed
                       rounded-lg transition-colors duration-200"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : (
              <Send className="w-4 h-4 text-white" />
            )}
          </button>
        </div>

        {/* Keyboard Hints */}
        <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
          <div className="flex items-center space-x-4">
            <span>Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">↵</kbd> to send</span>
            <span>Use <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">↑</kbd> <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">↓</kbd> to navigate</span>
          </div>
          <div className="flex items-center space-x-2">
            <Zap className="w-3 h-3" />
            <span>Powered by AI</span>
          </div>
        </div>
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 py-2 bg-slate-900/95 
                        border border-slate-700 rounded-xl shadow-2xl z-50
                        backdrop-blur-sm">
          <div className="px-3 py-1 text-xs text-slate-500 uppercase tracking-wider">
            Suggestions
          </div>
          <ul className="mt-1">
            {suggestions.map((suggestion, index) => (
              <li
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`px-4 py-2 cursor-pointer text-sm transition-colors
                  ${index === selectedIndex 
                    ? 'bg-violet-600/20 text-violet-200' 
                    : 'text-slate-300 hover:bg-slate-800'}
                `}
              >
                <span className="font-medium">{suggestion}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 pt-2 border-t border-slate-800 px-4 py-1 text-xs text-slate-500">
            {suggestions.length} suggestions available
          </div>
        </div>
      )}
    </div>
  );
}

export default CommandInput;