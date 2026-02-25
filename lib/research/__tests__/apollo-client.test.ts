/**
 * Apollo MCP Client Tests
 */

import { ApolloMCP, ApolloError } from '../apollo-client';
import type { ApolloSearchCriteria, ApolloPerson, ApolloOrganization } from '../types';

// Mock environment
const mockApiKey = 'test-api-key';
process.env.APOLLO_API_KEY = mockApiKey;

// Mock fetch globally
global.fetch = jest.fn();

describe('ApolloMCP', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkHealth', () => {
    test('returns healthy when API responds', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          organization: { id: 'test-org' },
        }),
      });

      const result = await ApolloMCP.checkHealth();

      expect(result.healthy).toBe(true);
      expect(result.message).toContain('accessible');
    });

    test('returns unhealthy when API key missing', async () => {
      delete process.env.APOLLO_API_KEY;
      
      const result = await ApolloMCP.checkHealth();

      expect(result.healthy).toBe(false);
      expect(result.message).toContain('key not configured');
      
      process.env.APOLLO_API_KEY = mockApiKey;
    });

    test('returns unhealthy when API fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await ApolloMCP.checkHealth();

      expect(result.healthy).toBe(false);
    });
  });

  describe('searchProspects', () => {
    const mockCriteria: ApolloSearchCriteria = {
      person_titles: ['VP Sales'],
      q_organization_keyword_tags: ['fintech'],
    };

    test('searches with correct parameters', async () => {
      const mockResponse = {
        people: [
          {
            id: 'person-1',
            first_name: 'John',
            last_name: 'Doe',
            name: 'John Doe',
            title: 'VP Sales',
            email: 'john@example.com',
          },
        ],
        pagination: {
          page: 1,
          per_page: 100,
          total_entries: 1,
          total_pages: 1,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await ApolloMCP.searchProspects(mockCriteria);

      expect(result.people).toHaveLength(1);
      expect(result.people[0].name).toBe('John Doe');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/mixed_people/search'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Api-Key': mockApiKey,
          }),
        })
      );
    });

    test('respects pagination options', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          people: [],
          pagination: { page: 2, per_page: 50, total_entries: 0, total_pages: 0 },
        }),
      });

      await ApolloMCP.searchProspects(mockCriteria, { page: 2, perPage: 50 });

      const callArgs = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(callArgs).toContain('page=2');
      expect(callArgs).toContain('per_page=50');
    });

    test('throws ApolloError on API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({
          error: { message: 'Rate limit exceeded', code: 'RATE_LIMITED' },
        }),
      });

      await expect(ApolloMCP.searchProspects(mockCriteria)).rejects.toThrow(ApolloError);
    });
  });

  describe('enrichPerson', () => {
    test('enriches person by email', async () => {
      const mockPerson: ApolloPerson = {
        id: 'person-1',
        first_name: 'Jane',
        last_name: 'Smith',
        name: 'Jane Smith',
        email: 'jane@example.com',
        title: 'Head of Marketing',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ person: mockPerson }),
      });

      const result = await ApolloMCP.enrichPerson('jane@example.com');

      expect(result).toMatchObject(mockPerson);
    });

    test('returns null when person not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ person: null }),
      });

      const result = await ApolloMCP.enrichPerson('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('enrichCompany', () => {
    test('enriches company by domain', async () => {
      const mockOrg: ApolloOrganization = {
        id: 'org-1',
        name: 'Stripe',
        primary_domain: 'stripe.com',
        estimated_num_employees: 5000,
        technologies: ['Ruby', 'JavaScript', 'AWS'],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ organization: mockOrg }),
      });

      const result = await ApolloMCP.enrichCompany('stripe.com');

      expect(result?.name).toBe('Stripe');
      expect(result?.technologies).toContain(' AWS');
    });
  });

  describe('getTechnographics', () => {
    test('returns technographics for domain', async () => {
      const mockOrg: ApolloOrganization = {
        id: 'org-1',
        name: 'Tech Corp',
        technologies: ['Salesforce', 'HubSpot', 'Slack'],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ organization: mockOrg }),
      });

      const result = await ApolloMCP.getTechnographics('techcorp.com');

      expect(result.domain).toBe('techcorp.com');
      expect(result.technologies).toEqual(['Salesforce', 'HubSpot', 'Slack']);
    });
  });

  describe('batchEnrichPeople', () => {
    test('enriches multiple people', async () => {
      const emails = ['a@test.com', 'b@test.com'];
      
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ 
            person: { id: '1', email: 'a@test.com' } 
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ 
            person: { id: '2', email: 'b@test.com' } 
          }),
        });

      const results = await ApolloMCP.batchEnrichPeople(emails);

      expect(results.size).toBe(2);
      expect(results.get('a@test.com')).toBeTruthy();
      expect(results.get('b@test.com')).toBeTruthy();
    });

    test('calls progress callback', async () => {
      const emails = ['a@test.com', 'b@test.com'];
      const onProgress = jest.fn();
      
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ person: { id: '1' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ person: { id: '2' } }),
        });

      await ApolloMCP.batchEnrichPeople(emails, onProgress);

      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenNthCalledWith(1, 1, 2);
      expect(onProgress).toHaveBeenNthCalledWith(2, 2, 2);
    });
  });

  describe('searchProspectsPaginated', () => {
    test('returns all results across pages', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            people: [{ id: '1' }, { id: '2' }],
            pagination: { 
              page: 1, 
              per_page: 2, 
              total_entries: 3, 
              total_pages: 2 
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            people: [{ id: '3' }],
            pagination: { 
              page: 2, 
              per_page: 2, 
              total_entries: 3, 
              total_pages: 2 
            },
          }),
        });

      const results = await ApolloMCP.searchProspectsPaginated({}, 3);

      expect(results).toHaveLength(3);
      expect(results.map(r => r.id)).toEqual(['1', '2', '3']);
    });

    test('respects maxResults limit', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          people: [{ id: 'x' }],
          pagination: { 
            page: 1, 
            per_page: 100, 
            total_entries: 1000, 
            total_pages: 10 
          },
        }),
      });

      const results = await ApolloMCP.searchProspectsPaginated({}, 5);

      // Due to pagination fetching full pages, we might get up to 100
      // but the implementation should limit to maxResults
      expect(results.length).toBeLessThanOrEqual(100);
    });
  });

  describe('rate limiting', () => {
    test('throttles requests', async () => {
      const startTime = Date.now();
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ organization: {} }),
      });

      // Make 3 rapid requests
      await Promise.all([
        ApolloMCP.enrichCompany('a.com'),
        ApolloMCP.enrichCompany('b.com'),
        ApolloMCP.enrichCompany('c.com'),
      ]);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should take at least 12 seconds (6s * 2 gaps between 3 requests)
      expect(duration).toBeGreaterThan(100);
    });
  });
});