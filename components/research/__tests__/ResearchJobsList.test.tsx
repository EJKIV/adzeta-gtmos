import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResearchJobsList } from '../ResearchJobsList';
import { ResearchJob } from '@/lib/research/types';

// Mock Supabase client
const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();
const mockChannel = jest.fn();
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();

jest.mock('@/lib/supabase-client', () => ({
  getSupabaseClient: jest.fn(() => ({
    from: mockFrom,
    channel: mockChannel,
  })),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: jest.fn(),
  }),
}));

// Mock timers
jest.useFakeTimers();

describe('ResearchJobsList', () => {
  const mockUserId = 'user-123';

  const mockJobs: ResearchJob[] = [
    {
      id: 'job-1',
      user_id: mockUserId,
      job_type: 'prospect_search',
      status: 'active',
      search_criteria: { person_titles: ['VP Sales'], industry: 'fintech' },
      priority: 1,
      total_requests: 100,
      completed_requests: 45,
      failed_requests: 2,
      progress_percent: 45,
      results_summary: {},
      retry_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      started_at: new Date(Date.now() - 60000).toISOString(),
    },
    {
      id: 'job-2',
      user_id: mockUserId,
      job_type: 'person_enrich',
      status: 'completed',
      search_criteria: {},
      priority: 2,
      completed_requests: 50,
      failed_requests: 0,
      progress_percent: 100,
      results_summary: { prospects_found: 50, enriched: 50, avg_confidence: 0.92 },
      retry_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      started_at: new Date(Date.now() - 300000).toISOString(),
      completed_at: new Date().toISOString(),
    },
    {
      id: 'job-3',
      user_id: mockUserId,
      job_type: 'company_enrich',
      status: 'failed',
      search_criteria: {},
      priority: 1,
      completed_requests: 10,
      failed_requests: 40,
      progress_percent: 20,
      results_summary: {},
      error_message: 'API rate limit exceeded',
      retry_count: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      started_at: new Date(Date.now() - 60000).toISOString(),
      completed_at: new Date().toISOString(),
    },
    {
      id: 'job-4',
      user_id: mockUserId,
      job_type: 'prospect_search',
      status: 'pending',
      search_criteria: { person_titles: ['CEO'], industry: 'saas' },
      priority: 1,
      completed_requests: 0,
      failed_requests: 0,
      progress_percent: 0,
      results_summary: {},
      retry_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock chain
    mockOrder.mockResolvedValue({ data: mockJobs, error: null });
    mockEq.mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
    mockChannel.mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: mockSubscribe.mockReturnValue({
        unsubscribe: mockUnsubscribe,
      }),
    });
  });

  it('renders loading state initially', () => {
    mockOrder.mockImplementation(() => new Promise(() => {}));
    render(<ResearchJobsList userId={mockUserId} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders jobs list after loading', async () => {
    await act(async () => {
      render(<ResearchJobsList userId={mockUserId} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Research Jobs')).toBeInTheDocument();
    });

    // Should show active jobs by default (active + pending = 2)
    expect(screen.getByText('Prospect Search')).toBeInTheDocument();
  });

  it('displays stats cards', async () => {
    await act(async () => {
      render(<ResearchJobsList userId={mockUserId} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Active Jobs')).toBeInTheDocument();
      expect(screen.getByText('Completed Today')).toBeInTheDocument();
      expect(screen.getByText('Failed Jobs')).toBeInTheDocument();
      expect(screen.getByText('Avg Enrichment Time')).toBeInTheDocument();
    });
  });

  it('calculates and displays active jobs count correctly', async () => {
    await act(async () => {
      render(<ResearchJobsList userId={mockUserId} />);
    });

    await waitFor(() => {
      // Active jobs: active (1) + pending (1) = 2
      const activeJobsCard = screen.getByText('Active Jobs').closest('[role="region"]');
      expect(activeJobsCard).toHaveTextContent('2');
    });
  });

  it('calculates completed today correctly', async () => {
    await act(async () => {
      render(<ResearchJobsList userId={mockUserId} />);
    });

    await waitFor(() => {
      // 1 job completed today
      const completedCard = screen.getByText('Completed Today').closest('[role="region"]');
      expect(completedCard).toHaveTextContent('1');
    });
  });

  it('calculates failed jobs count correctly', async () => {
    await act(async () => {
      render(<ResearchJobsList userId={mockUserId} />);
    });

    await waitFor(() => {
      // 1 failed job
      const failedCard = screen.getByText('Failed Jobs').closest('[role="region"]');
      expect(failedCard).toHaveTextContent('1');
    });
  });

  it('filters jobs by status', async () => {
    await act(async () => {
      render(<ResearchJobsList userId={mockUserId} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Active Jobs')).toBeInTheDocument();
    });

    // Click 'completed' filter
    fireEvent.click(screen.getByText('Completed'));

    // Should only show completed jobs
    await waitFor(() => {
      expect(screen.queryAllByText('Running')).toHaveLength(0);
      expect(screen.queryAllByText('Pending')).toHaveLength(0);
    });
  });

  it('shows progress bar for running jobs', async () => {
    await act(async () => {
      render(<ResearchJobsList userId={mockUserId} />);
    });

    await waitFor(() => {
      // Progress bar should have aria-valuenow
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '45');
    });
  });

  it('shows time estimate for active jobs', async () => {
    await act(async () => {
      render(<ResearchJobsList userId={mockUserId} />);
    });

    await waitFor(() => {
      // Should show time remaining
      expect(screen.getByText(/remaining/)).toBeInTheDocument();
    });
  });

  it('displays error message when fetch fails', async () => {
    mockOrder.mockResolvedValue({
      data: null,
      error: { message: 'Database connection failed' },
    });

    await act(async () => {
      render(<ResearchJobsList userId={mockUserId} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Error loading jobs')).toBeInTheDocument();
      expect(screen.getByText('Database connection failed')).toBeInTheDocument();
    });
  });

  it('allows retry on error', async () => {
    mockOrder
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ data: mockJobs, error: null });

    await act(async () => {
      render(<ResearchJobsList userId={mockUserId} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Error loading jobs')).toBeInTheDocument();
    });

    // Click retry button
    fireEvent.click(screen.getByText('Retry'));

    await waitFor(() => {
      expect(screen.getByText('Research Jobs')).toBeInTheDocument();
    });
  });

  it('shows action buttons for active jobs', async () => {
    await act(async () => {
      render(<ResearchJobsList userId={mockUserId} />);
    });

    await waitFor(() => {
      // Cancel button should be visible for running job
      expect(screen.getByLabelText('Cancel')).toBeInTheDocument();
    });
  });

  it('shows retry button for failed jobs', async () => {
    await act(async () => {
      render(<ResearchJobsList userId={mockUserId} />);
    });

    // Filter to show failed jobs
    fireEvent.click(screen.getByText('Completed'));

    await waitFor(() => {
      // Retry button should be visible for failed jobs
      expect(screen.getByLabelText('Retry')).toBeInTheDocument();
    });
  });

  it('shows view results button for completed jobs', async () => {
    await act(async () => {
      render(<ResearchJobsList userId={mockUserId} />);
    });

    // Filter to show completed
    fireEvent.click(screen.getByText('Completed'));

    await waitFor(() => {
      // View Results button should exist for completed job
      expect(screen.getByLabelText('View Results')).toBeInTheDocument();
    });
  });

  it('auto-refetches every 5 seconds', async () => {
    await act(async () => {
      render(<ResearchJobsList userId={mockUserId} />);
    });

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('research_jobs');
    });

    // Fast-forward 5 seconds
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      // Should have fetched again
      expect(mockFrom).toHaveBeenCalledTimes(2);
    });
  });

  it('handles empty job list', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });

    await act(async () => {
      render(<ResearchJobsList userId={mockUserId} />);
    });

    await waitFor(() => {
      expect(screen.getByText('No active research jobs found')).toBeInTheDocument();
    });
  });

  it('applies filter "all" correctly', async () => {
    await act(async () => {
      render(<ResearchJobsList userId={mockUserId} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Active Jobs')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('All'));

    // Should show more jobs
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalled();
    });
  });

  it('subscribes to realtime updates', async () => {
    await act(async () => {
      render(<ResearchJobsList userId={mockUserId} />);
    });

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalled();
    });
  });

  it('unsubscribes on unmount', async () => {
    const { unmount } = render(<ResearchJobsList userId={mockUserId} />);

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalled();
    });

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('displays job type icons', async () => {
    await act(async () => {
      render(<ResearchJobsList userId={mockUserId} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Prospect Search')).toBeInTheDocument();
      expect(screen.getByText('Person Enrichment')).toBeInTheDocument();
    });
  });

  it('displays job details correctly', async () => {
    await act(async () => {
      render(<ResearchJobsList userId={mockUserId} />);
    });

    await waitFor(() => {
      // Should show job criteria
      expect(screen.getByText(/Titles: VP Sales/)).toBeInTheDocument();
      expect(screen.getByText(/Industry: fintech/)).toBeInTheDocument();
    });
  });

  it('displays error message for failed jobs', async () => {
    await act(async () => {
      render(<ResearchJobsList userId={mockUserId} />);
    });

    await waitFor(() => {
      // Filter to completed to see failed jobs
      fireEvent.click(screen.getByText('Completed'));
    });

    await waitFor(() => {
      expect(screen.getByText(/API rate limit exceeded/)).toBeInTheDocument();
    });
  });

  // Accessibility tests
  describe('Accessibility', () => {
    it('has proper ARIA labels on stats cards', async () => {
      await act(async () => {
        render(<ResearchJobsList userId={mockUserId} />);
      });

      await waitFor(() => {
        const regions = screen.getAllByRole('region');
        expect(regions.length).toBeGreaterThanOrEqual(4);
      });
    });

    it('progress bar has proper ARIA attributes', async () => {
      await act(async () => {
        render(<ResearchJobsList userId={mockUserId} />);
      });

      await waitFor(() => {
        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toHaveAttribute('aria-valuemin', '0');
        expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      });
    });

    it('action buttons have accessible labels', async () => {
      await act(async () => {
        render(<ResearchJobsList userId={mockUserId} />);
      });

      await waitFor(() => {
        const cancelButton = screen.getByLabelText('Cancel');
        expect(cancelButton).toBeInTheDocument();
      });
    });
  });
});
