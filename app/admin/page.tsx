'use client';

import { EmployeeManagement } from '@/app/components/employee-management';
import { LoginGate } from '@/app/components/login-gate';

export default function AdminPage() {
  return (
    <LoginGate>
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <EmployeeManagement />
        </div>
      </main>
    </LoginGate>
  );
}
