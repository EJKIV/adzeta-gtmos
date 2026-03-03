import { AnalyticsEvent } from './mock-events';

// ─────────────────────────────────────────────────────────────────────────────
// Event Export Utilities
// ─────────────────────────────────────────────────────────────────────────────

export type ExportFormat = 'csv' | 'json';

interface ExportOptions {
  format: ExportFormat;
  filename?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON Export
// ─────────────────────────────────────────────────────────────────────────────

export function exportEventsAsJSON(events: AnalyticsEvent[], filename?: string): void {
  const data = {
    exportedAt: new Date().toISOString(),
    count: events.length,
    events,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { 
    type: 'application/json' 
  });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().slice(0, 10);
  
  link.href = url;
  link.download = filename || `events-${timestamp}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV Export
// ─────────────────────────────────────────────────────────────────────────────

function escapeCSV(value: string): string {
  // Escape quotes and wrap in quotes if needed
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportEventsAsCSV(events: AnalyticsEvent[], filename?: string): void {
  // CSV Headers
  const headers = [
    'ID',
    'Timestamp',
    'User ID',
    'User Name',
    'User Email',
    'Event Type',
    'Summary',
    'Details',
    'Related Entity Type',
    'Related Entity ID',
    'Related Entity Name',
  ];

  // CSV Rows
  const rows = events.map((event) => [
    event.id,
    event.timestamp,
    event.user.id,
    event.user.name,
    event.user.email,
    event.type,
    event.summary,
    JSON.stringify(event.details),
    event.relatedEntity?.type || '',
    event.relatedEntity?.id || '',
    event.relatedEntity?.name || '',
  ]);

  // Build CSV content
  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map((row) => row.map((cell) => escapeCSV(String(cell || ''))).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = filename || `events-${timestamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic Export Function
// ─────────────────────────────────────────────────────────────────────────────

export function exportEvents(events: AnalyticsEvent[], options: ExportOptions): void {
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = options.filename || `events-${timestamp}`;

  switch (options.format) {
    case 'csv':
      exportEventsAsCSV(events, filename.endsWith('.csv') ? filename : `${filename}.csv`);
      break;
    case 'json':
      exportEventsAsJSON(events, filename.endsWith('.json') ? filename : `${filename}.json`);
      break;
    default:
      throw new Error(`Unsupported export format: ${options.format}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Export Button Component Helper
// ─────────────────────────────────────────────────────────────────────────────

export interface ExportButtonProps {
  events: AnalyticsEvent[];
  disabled?: boolean;
  onExportStart?: () => void;
  onExportComplete?: () => void;
}

export default exportEvents;