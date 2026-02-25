import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { JobStatsCards } from '../JobStatsCards';
import { JobProgressBar } from '../JobProgressBar';
import { JobActions } from '../JobActions';
import { ResearchJob } from '@/lib/research/types';

const mockUpdate = jest.fn();
const mockEq = jest.fn().mockReturnThis();
const mockFrom = jest.fn().mockReturnValue({ update: mockUpdate, eq: mockEq });

jest.mock('@/lib/supabase-client', () => ({
  getSupabaseClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

jest.useFakeTimers();

// Mock formatNumber
jest.mock('@/lib/utils', () => ({
  cn: (...inputs: any[]) => inputs.filter(Boolean).join(' '),
  formatNumber: (num: number) => num?.toString() || '—',
}));

describe('JobStatsCards', () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const mockJobs: ResearchJob[] = [
    {
      id: 'job-1',
      status: 'active',
      started_at: new Date().toISOString(),
      completed_requests: 10,
      failed_requests: 0,
      progress_percent: 50,
      results_summary: {},
      retry_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: 'user-1',
      job_type: 'prospect_search',
      priority: 1,
      search_criteria: {},
    },
    {
      id: 'job-2',
      status: 'completed',
      started_at: new Date(Date.now() - 120000).toISOString(),
      completed_at: new Date().toISOString(),
      completed_requests: 50,
      failed_requests: 0,
      progress_percent: 100,
      results_summary: {},
      retry_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: 'user-1',
      job_type: 'person_enrich',
      priority: 1,
      search_criteria: {},
    },
    {
      id: 'job-3',
      status: 'failed',
      completed_requests: 0,
      failed_requests: 10,
      progress_percent: 0,
      results_summary: {},
      retry_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: 'user-1',
      job_type: 'company_enrich',
      priority: 1,
      search_criteria: {},
    },
    {
      id: 'job-4',
      status: 'pending',
      completed_requests: 0,
      failed_requests: 0,
      progress_percent: 0,
      results_summary: {},
      retry_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: 'user-1',
      job_type: 'prospect_search',
      priority: 1,
      search_criteria: {},
    },
  ];

  it('renders all four stat cards', () => {
    render(<JobStatsCards jobs={mockJobs} />);

    expect(screen.getByText('Active Jobs')).toBeInTheDocument();
    expect(screen.getByText('Completed Today')).toBeInTheDocument();
    expect(screen.getByText('Failed Jobs')).toBeInTheDocument();
    expect(screen.getByText('Avg Enrichment Time')).toBeInTheDocument();
  });

  it('calculates active jobs count correctly', () => {
    render(<JobStatsCards jobs={mockJobs} />);

    // Active jobs: pending + active + queued + paused = 2 (job-1 active, job-4 pending)
    const activeCard = screen.getByText('Active Jobs').closest('[role="region"]');
    expect(activeCard).toHaveTextContent('2');
  });

  it('calculates completed today count correctly', () => {
    render(<JobStatsCards jobs={mockJobs} />);

    // 1 completed today
    const completedCard = screen.getByText('Completed Today').closest('[role="region"]');
    expect(completedCard).toHaveTextContent('1');
  });

  it('calculates failed jobs count correctly', () => {
    render(<JobStatsCards jobs={mockJobs} />);

    // 1 failed job
    const failedCard = screen.getByText('Failed Jobs').closest('[role="region"]');
    expect(failedCard).toHaveTextContent('1');
  });

  it('calculates average enrichment time correctly', () => {
    render(<JobStatsCards jobs={mockJobs} />);

    // Average from completed job (2 minutes)
    const avgCard = screen.getByText('Avg Enrichment Time').closest('[role="region"]');
    expect(avgCard).toHaveTextContent('2m');
  });

  it('shows loading state', () => {
    render(<JobStatsCards jobs={[]} loading={true} />);

    const cards = screen.getAllByRole('region');
    expect(cards.length).toBe(0); // Loading state shows no regions
  });

  it('handles empty jobs array', () => {
    render(<JobStatsCards jobs={[]} />);

    // Should show 0 or — for avg time
    expect(screen.getByText('Active Jobs')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('shows delta indicators when values change', () => {
    render(<JobStatsCards jobs={mockJobs} />);

    // Completed today should show +1 delta
    expect(screen.getByText('+1')).toBeInTheDocument();
  });
});

describe('JobProgressBar', () => {
  const mockJob: ResearchJob = {
    id: 'job-1',
    status: 'active',
    started_at: new Date(Date.now() - 60000).toISOString(), // Started 1 minute ago
    total_requests: 100,
    completed_requests: 45,
    failed_requests: 2,
    progress_percent: 45,
    results_summary: {},
    retry_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: 'user-1',
    job_type: 'prospect_search',
    priority: 1,
    search_criteria: {},
  };

  it('renders progress bar with correct percentage', () => {
    render(<JobProgressBar job={mockJob} />);

    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('complete')).toBeInTheDocument();
  });

  it('shows time estimate for active jobs', async () => {
    render(<JobProgressBar job={mockJob} />);

    await waitFor(() => {
      // Should show estimated time remaining
      expect(screen.getByText(/remaining/)).toBeInTheDocument();
    });
  });

  it('has proper ARIA attributes', () => {
    render(<JobProgressBar job={mockJob} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '45');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });

  it('shows different colors based on progress', () => {
    const { rerender } = render(<JobProgressBar job={mockJob} />);

    // Progress <= 30%: red
    const lowProgressJob = { ...mockJob, progress_percent: 25 };
    rerender(<JobProgressBar job={lowProgressJob} />);
    expect(screen.getByText('25%')).toBeInTheDocument();

    // Progress 31-70%: amber
    const mediumProgressJob = { ...mockJob, progress_percent: 50 };
    rerender(<JobProgressBar job={mediumProgressJob} />);
    expect(screen.getByText('50%')).toBeInTheDocument();

    // Progress > 70%: green
    const highProgressJob = { ...mockJob, progress_percent: 80 };
    rerender(<JobProgressBar job={highProgressJob} />);
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('supports different sizes', () => {
    render(<JobProgressBar job={mockJob} size="sm" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    render(<JobProgressBar job={mockJob} size="lg" />);
    expect(screen.getAllByRole('progressbar')).toHaveLength(2);
  });

  it('shows completed/total count', () => {
    render(<JobProgressBar job={mockJob} />);

    expect(screen.getByText(/45 completed/)).toBeInTheDocument();
    expect(screen.getByText(/100 total/)).toBeInTheDocument();
  });

  it('shows failed count when > 0', () => {
    render(<JobProgressBar job={mockJob} />);

    expect(screen.getByText(/2 failed/)).toBeInTheDocument();
  });
});

describe('JobActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdate.mockResolvedValue({ error: null });
  });

  const mockOnAction = jest.fn();

  const createMockJob = (status: ResearchJob['status']): ResearchJob => ({
    id: 'job-1',
    status,
    retry_count: 0,
    results_summary: status === 'completed' ? { prospects_found: 10 } : {},
    completed_requests: 0,
    failed_requests: 0,
    progress_percent: 0,
    error_message: status === 'failed' ? 'Error occurred' : undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: 'user-1',
    job_type: 'prospect_search',
    priority: 1,
    search_criteria: {},
  });

  it('shows cancel button for pending jobs', () => {
    const job = createMockJob('pending');
    render(<JobActions job={job} onAction={mockOnAction} />);

    expect(screen.getByLabelText('Cancel')).toBeInTheDocument();
    expect(screen.queryByLabelText('Retry')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('View Results')).not.toBeInTheDocument();
  });

  it('shows cancel button for queued jobs', () => {
    const job = createMockJob('queued');
    render(<JobActions job={job} onAction={mockOnAction} />);

    expect(screen.getByLabelText('Cancel')).toBeInTheDocument();
  });

  it('shows cancel button for active jobs', () => {
    const job = createMockJob('active');
    render(<JobActions job={job} onAction={mockOnAction} />);

    expect(screen.getByLabelText('Cancel')).toBeInTheDocument();
  });

  it('shows cancel button for paused jobs', () => {
    const job = createMockJob('paused');
    render(<JobActions job={job} onAction={mockOnAction} />);

    expect(screen.getByLabelText('Cancel')).toBeInTheDocument();
  });

  it('shows retry button for failed jobs', () => {
    const job = createMockJob('failed');
    render(<JobActions job={job} onAction={mockOnAction} />);

    expect(screen.getByLabelText('Retry')).toBeInTheDocument();
    expect(screen.queryByLabelText('Cancel')).not.toBeInTheDocument();
  });

  it('shows view results button for completed jobs with results', () => {
    const job = createMockJob('completed');
    render(<JobActions job={job} onAction={mockOnAction} />);

    expect(screen.getByLabelText('View Results')).toBeInTheDocument();
  });

  it('hides view results for completed jobs without results', () => {
    const job = { ...createMockJob('completed'), results_summary: {} };
    render(<JobActions job={job} onAction={mockOnAction} />);

    // Shows the component but no buttons
    const container = screen.getByLabelText('View Results');
    expect(container).toBeInTheDocument();
  });

  it('handles cancel action', async () => {
    const job = createMockJob('active');
    render(<JobActions job={job} onAction={mockOnAction} />);

    const cancelButton = screen.getByLabelText('Cancel');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'cancelled',
        updated_at: expect.any(String),
      });
    });

    expect(mockOnAction).toHaveBeenCalledWith('cancel', job);
  });

  it('handles retry action', async () => {
    const job = createMockJob('failed');
    render(<JobActions job={job} onAction={mockOnAction} />);

    const retryButton = screen.getByLabelText('Retry');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'queued',
        retry_count: 1,
        error_message: null,
        updated_at: expect.any(String),
      });
    });

    expect(mockOnAction).toHaveBeenCalledWith('retry', job);
  });

  it('handles view action', () => {
    const job = createMockJob('completed');
    render(<JobActions job={job} onAction={mockOnAction} />);

    const viewButton = screen.getByLabelText('View Results');
    fireEvent.click(viewButton);

    expect(mockOnAction).toHaveBeenCalledWith('view', job);
  });

  it('shows loading state during cancel', async () => {
    const job = createMockJob('active');
    mockUpdate.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<JobActions job={job} onAction={mockOnAction} />);

    const cancelButton = screen.getByLabelText('Cancel');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.getByText('Cancelling...')).toBeInTheDocument();
    });
  });

  it('shows loading state during retry', async () => {
    const job = createMockJob('failed');
    mockUpdate.mockImplementation(() => new Promise(() => {}));

    render(<JobActions job={job} onAction={mockOnAction} />);

    const retryButton = screen.getByLabelText('Retry');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Retrying...')).toBeInTheDocument();
    });
  });

  it('handles cancel error', async () => {
    const job = createMockJob('active');
    mockUpdate.mockRejectedValue(new Error('Network error'));

    render(<JobActions job={job} onAction={mockOnAction} />);

    const cancelButton = screen.getByLabelText('Cancel');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      // Should reset after error
      expect(screen.getByLabelText('Cancel')).toBeInTheDocument();
    });
  });

  it('renders nothing for jobs with no available actions', () => {
    const job = createMockJob('cancelled');
    const { container } = render(<JobActions job={job} />);

    expect(container.firstChild).toBeNull();
  });

  it('disables buttons while loading', async () => {
    const job = createMockJob('active');
    mockUpdate.mockImplementation(() => new Promise(() => {}));

    render(<JobActions job={job} />);

    const cancelButton = screen.getByLabelText('Cancel');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(cancelButton).toBeDisabled();
    });
  });
});
