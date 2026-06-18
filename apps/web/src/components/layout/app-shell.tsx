'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar — desktop */}
      <div
        className={cn(
          'hidden lg:flex flex-col flex-shrink-0 transition-all duration-300 z-30',
          sidebarCollapsed ? 'w-16' : 'w-72',
        )}
      >
        <Sidebar collapsed={sidebarCollapsed} />
      </div>

      {/* Sidebar — mobile */}
      <div
        className={cn(
          'fixed left-0 top-0 h-full z-50 lg:hidden transition-transform duration-300',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <Sidebar collapsed={false} />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onMenuToggle={() => {
            if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
              setSidebarCollapsed(c => !c);
            } else {
              setMobileSidebarOpen(o => !o);
            }
          }}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
