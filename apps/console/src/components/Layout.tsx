import { NavLink } from 'react-router-dom';
import { Home, Zap, Settings, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { to: '/', icon: Home, label: 'Overview' },
  { to: '/events', icon: Zap, label: 'Events' },
  { to: '/operations', icon: Activity, label: 'Operations' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card hidden md:flex md:flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-bold text-primary">EventForge</h1>
          <p className="text-xs text-muted-foreground mt-1">Operator Console</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-border text-xs text-muted-foreground">
          <p>EventForge Console v1.0</p>
          <p className="mt-1">Production-ready event ingestion</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 border-b border-border bg-card flex items-center px-6">
          <div className="flex items-center gap-4 md:hidden">
            <h1 className="text-xl font-bold text-primary">EventForge</h1>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {import.meta.env.VITE_EVENTFORGE_API_URL ? (
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  API Connected
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-yellow-500" />
                  No API URL
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Mobile nav */}
        <nav className="md:hidden border-b border-border bg-card p-2 flex gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
