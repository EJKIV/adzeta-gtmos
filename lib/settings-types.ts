export interface SettingsData {
  autonomy_level: 'conservative' | 'balanced' | 'autonomous';
  confidence_threshold: number;
  auto_execute_enabled: boolean;
  cost_gate_threshold: number;
  icp_industries: string[];
  icp_company_size: { min: number; max: number };
  icp_geographies: string[];
  icp_job_titles: string[];
  icp_exclusions: string[];
  notification_channels: ('email' | 'in_app')[];
}

export const DEFAULT_SETTINGS: SettingsData = {
  autonomy_level: 'balanced',
  confidence_threshold: 80,
  auto_execute_enabled: true,
  cost_gate_threshold: 1.0,
  icp_industries: [],
  icp_company_size: { min: 50, max: 10000 },
  icp_geographies: [],
  icp_job_titles: [],
  icp_exclusions: [],
  notification_channels: ['in_app'],
};
