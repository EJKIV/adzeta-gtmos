# Database Connection States

## Empty States Implementation

### 1. Loading State (Fetching Data)
- Skeleton loaders for cards
- Pulse animation on KPIs
- Shimmer effect on lists

### 2. Error State (Connection Broken)
- Friendly error message
- Retry button
- Fallback to localStorage/cache
- Graceful degradation

### 3. Empty State (Connected, No Data)
- "No data yet" message
- CTA to create/add
- Demo/sample data option
- Onboarding prompts

### 4. Success State (Data Present)
- Full UI render
- Interactive elements
- Real-time updates

## Implementation Pattern

```typescript
// hooks/use-data-with-states.ts
export function useDataWithStates<T>(table: string) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from(table)
          .select('*');
          
        if (error) throw error;
        
        setData(data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [table]);
  
  return { data, loading, error, retry: fetchData };
}
```
