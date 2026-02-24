import { Loader2, AlertCircle, Database, Plus } from 'lucide-react';

interface DataStateHandlerProps {
  status: 'loading' | 'error' | 'empty' | 'success';
  error?: Error;
  retry?: () => void;
  createSample?: () => void;
  children: React.ReactNode;
}

export function DataStateHandler({ 
  status, 
  error, 
  retry, 
  createSample,
  children 
}: DataStateHandlerProps) {
  switch (status) {
    case 'loading':
      return (<LoadingState />);
    
    case 'error':
      return (
        <ErrorState 
          error={error} 
          retry={retry} 
        />
      );
    
    case 'empty':
      return (
        <EmptyState 
          createSample={createSample}
        />
      );
    
    case 'success':
    default:
      return <>{children}</>;
  }
}

// Loading State
function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <Loader2 className="w-8 h-8 animate-spin text-[#635bff]" />
      <p className="text-gray-500 text-sm">Loading data...</p>
    </div>
  );
}

// Error State
interface ErrorStateProps {
  error?: Error;
  retry?: () => void;
}

function ErrorState({ error, retry }: ErrorStateProps) {
  const isConnectionError = error?.message?.includes('Failed to fetch') || 
                            error?.message?.includes('NetworkError') ||
                            error?.message?.includes('ECONNREFUSED');
  
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4 bg-red-50 rounded-lg border border-red-100 p-6">
      <AlertCircle className="w-12 h-12 text-red-500" />
      
      <div className="text-center">
        <h3 className="font-medium text-red-900 mb-1">
          {isConnectionError ? 'Database connection failed' : 'Something went wrong'}
        </h3>
        
        <p className="text-sm text-red-600 max-w-md">
          {isConnectionError 
            ? 'Unable to connect to the database. This might be a temporary issue or the database might be down.'
            : error?.message
          }
        </p>
      </div>
      
      {retry && (
        <button
          onClick={retry}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
        >
          Retry Connection
        </button>
      )}
    </div>
  );
}

// Empty State
interface EmptyStateProps {
  createSample?: () => void;
}

function EmptyState({ createSample }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4 bg-gray-50 rounded-lg border border-gray-200 p-6">
      <Database className="w-12 h-12 text-gray-400" />
      
      <div className="text-center">
        <h3 className="font-medium text-gray-900 mb-1">No data yet</h3>
        <p className="text-sm text-gray-500 max-w-md">
          Your database connection is working, but there's no data to display. 
          Start using the system and data will appear here.
        </p>
      </div>
      
      {createSample && (
        <button
          onClick={createSample}
          className="flex items-center gap-2 px-4 py-2 bg-[#635bff] text-white rounded-lg text-sm font-medium hover:bg-[#0a2540] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Sample Data
        </button>
      )}
    </div>
  );
}
