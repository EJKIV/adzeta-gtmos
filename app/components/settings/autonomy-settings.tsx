'use client';

import { useState, useEffect } from 'react';
import type { SettingsData } from '@/lib/settings-types';

const AUTONOMY_LEVELS = [
  {
    value: 'conservative' as const,
    label: 'Conservative',
    description: 'Agent proposes, you approve everything',
  },
  {
    value: 'balanced' as const,
    label: 'Balanced',
    description: 'Auto-execute low-risk actions, approve the rest',
  },
  {
    value: 'autonomous' as const,
    label: 'Autonomous',
    description: 'Agent handles routine tasks independently',
  },
];

export function AutonomySettings({
  settings,
  onSave,
  isSaving,
  saveStatus,
}: {
  settings: SettingsData;
  onSave: (updates: Partial<SettingsData>) => void;
  isSaving: boolean;
  saveStatus: 'idle' | 'saved' | 'error';
}) {
  const [level, setLevel] = useState(settings.autonomy_level);
  const [autoExecute, setAutoExecute] = useState(settings.auto_execute_enabled);
  const [threshold, setThreshold] = useState(settings.confidence_threshold);
  const [costGate, setCostGate] = useState(settings.cost_gate_threshold);

  useEffect(() => {
    setLevel(settings.autonomy_level);
    setAutoExecute(settings.auto_execute_enabled);
    setThreshold(settings.confidence_threshold);
    setCostGate(settings.cost_gate_threshold);
  }, [settings]);

  const handleSave = () => {
    onSave({
      autonomy_level: level,
      auto_execute_enabled: autoExecute,
      confidence_threshold: threshold,
      cost_gate_threshold: costGate,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
          Agent Autonomy
        </h3>
        <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
          Control how much independence your agents have
        </p>
      </div>

      {/* Autonomy Level */}
      <div className="space-y-3">
        <label className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          Autonomy Level
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {AUTONOMY_LEVELS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setLevel(opt.value)}
              className="p-4 rounded-xl border text-left transition-all"
              style={{
                backgroundColor: level === opt.value ? 'rgba(222, 52, 127, 0.04)' : 'var(--color-bg-elevated)',
                borderColor: level === opt.value ? '#de347f' : 'var(--color-border)',
                boxShadow: level === opt.value ? '0 0 0 1px #de347f' : undefined,
              }}
            >
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {opt.label}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                {opt.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Auto-Execute Toggle */}
      <div
        className="flex items-center justify-between p-4 rounded-xl border"
        style={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}
      >
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            Auto-execute high-confidence actions
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
            Automatically run actions above the confidence threshold
          </p>
        </div>
        <button
          role="switch"
          aria-checked={autoExecute}
          aria-label="Auto-execute high-confidence actions"
          onClick={() => setAutoExecute(!autoExecute)}
          className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
          style={{ backgroundColor: autoExecute ? '#de347f' : 'var(--color-bg-tertiary)' }}
        >
          <div
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
            style={{ transform: autoExecute ? 'translateX(22px)' : 'translateX(2px)' }}
          />
        </button>
      </div>

      {/* Confidence Threshold */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            Confidence Threshold
          </label>
          <span className="text-sm font-semibold" style={{ color: '#de347f' }}>
            {threshold}%
          </span>
        </div>
        <input
          type="range"
          min={50}
          max={100}
          value={threshold}
          aria-label="Confidence threshold percentage"
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="w-full accent-[#de347f]"
        />
        <div className="flex justify-between text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Cost Gate */}
      <div className="space-y-2">
        <label className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          Cost Gate Threshold
        </label>
        <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          Actions above this cost require manual approval
        </p>
        <div className="relative w-40">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            $
          </span>
          <input
            type="number"
            min={0}
            step={0.5}
            value={costGate}
            onChange={(e) => setCostGate(Number(e.target.value))}
            className="w-full pl-7 pr-3 py-2 text-sm rounded-lg border outline-none transition-colors"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>
      </div>

      {/* Save */}
      <div className="pt-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 text-sm font-medium text-white rounded-lg transition-opacity disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #de347f, #8f76f5)' }}
        >
          {isSaving ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save Changes'}
        </button>
        {saveStatus === 'error' && (
          <span className="ml-3 text-sm text-rose-500">Failed to save</span>
        )}
      </div>
    </div>
  );
}
