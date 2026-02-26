/**
 * Single import point for all skill handler side-effect registrations.
 * Import this file once to ensure every handler is registered.
 */
import './handlers/analytics-pipeline';
import './handlers/analytics-kpi';
import './handlers/research-search';
import './handlers/research-enrich';
import './handlers/intel-recommendations';
import './handlers/workflow-campaign';
import './handlers/workflow-export';
import './handlers/system-help';
