'use client';

import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_SETTINGS, type SettingsData } from '@/lib/settings-types';

export function useSettings(userId: string | null) {
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/users/${userId}/preferences`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setSettings({ ...DEFAULT_SETTINGS, ...data });
          }
        }
      } catch {
        // Fall back to defaults
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [userId]);

  const save = useCallback(async (updates: Partial<SettingsData>) => {
    if (!userId) return;
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const merged = { ...settings, ...updates };
      const res = await fetch(`/api/users/${userId}/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged),
      });

      if (res.ok) {
        setSettings(merged);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }, [userId, settings]);

  return { settings, isLoading, isSaving, saveStatus, save, setSettings };
}
