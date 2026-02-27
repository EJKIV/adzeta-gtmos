'use client';

import { useState, useEffect, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import type { SettingsData } from '@/lib/settings-types';

function TagInput({
  label,
  description,
  tags,
  onChange,
  placeholder,
}: {
  label: string;
  description?: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      if (!tags.includes(input.trim())) {
        onChange([...tags, input.trim()]);
      }
      setInput('');
    }
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
        {label}
      </label>
      {description && (
        <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{description}</p>
      )}
      <div
        className="flex flex-wrap gap-2 p-2 rounded-lg border min-h-[42px]"
        style={{
          backgroundColor: 'var(--color-bg-primary)',
          borderColor: 'var(--color-border)',
        }}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full"
            style={{ backgroundColor: 'rgba(222, 52, 127, 0.08)', color: '#de347f' }}
          >
            {tag}
            <button onClick={() => removeTag(tag)} className="hover:opacity-70" aria-label={`Remove ${tag}`}>
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] text-sm bg-transparent outline-none"
          style={{ color: 'var(--color-text-primary)' }}
        />
      </div>
    </div>
  );
}

export function IcpSettings({
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
  const [industries, setIndustries] = useState(settings.icp_industries);
  const [geos, setGeos] = useState(settings.icp_geographies);
  const [titles, setTitles] = useState(settings.icp_job_titles);
  const [exclusions, setExclusions] = useState(settings.icp_exclusions);
  const [sizeMin, setSizeMin] = useState(settings.icp_company_size.min);
  const [sizeMax, setSizeMax] = useState(settings.icp_company_size.max);

  useEffect(() => {
    setIndustries(settings.icp_industries);
    setGeos(settings.icp_geographies);
    setTitles(settings.icp_job_titles);
    setExclusions(settings.icp_exclusions);
    setSizeMin(settings.icp_company_size.min);
    setSizeMax(settings.icp_company_size.max);
  }, [settings]);

  const sizeError = sizeMin > sizeMax;

  const handleSave = () => {
    if (sizeError) return;
    onSave({
      icp_industries: industries,
      icp_geographies: geos,
      icp_job_titles: titles,
      icp_exclusions: exclusions,
      icp_company_size: { min: sizeMin, max: sizeMax },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
          ICP &amp; Targeting
        </h3>
        <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
          Define your ideal customer profile for agent research
        </p>
      </div>

      <TagInput
        label="Industry Targeting"
        placeholder="Type an industry and press Enter"
        tags={industries}
        onChange={setIndustries}
      />

      <div className="space-y-2">
        <label className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          Company Size (employees)
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            value={sizeMin}
            onChange={(e) => setSizeMin(Number(e.target.value))}
            className="w-28 px-3 py-2 text-sm rounded-lg border outline-none"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
            placeholder="Min"
          />
          <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>to</span>
          <input
            type="number"
            min={1}
            value={sizeMax}
            onChange={(e) => setSizeMax(Number(e.target.value))}
            className="w-28 px-3 py-2 text-sm rounded-lg border outline-none"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
            placeholder="Max"
          />
        </div>
        {sizeError && (
          <p className="text-xs text-rose-500">Minimum cannot exceed maximum</p>
        )}
      </div>

      <TagInput
        label="Geographic Focus"
        placeholder="Type a region and press Enter"
        tags={geos}
        onChange={setGeos}
      />

      <TagInput
        label="Job Title Targeting"
        placeholder="Type a title and press Enter"
        tags={titles}
        onChange={setTitles}
      />

      <TagInput
        label="Exclusion Rules"
        description="Companies or domains to always exclude"
        placeholder="Type to exclude and press Enter"
        tags={exclusions}
        onChange={setExclusions}
      />

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
