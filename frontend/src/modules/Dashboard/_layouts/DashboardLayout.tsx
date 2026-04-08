import { type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Activity, Circle, LogIn, LogOut, UserCircle2 } from 'lucide-react';
import { cn } from '@/shadecn/lib/utils';
import { Button } from '@UI/index';
import { useAuth } from '@hooks/useAuth';
import { useSocket } from '@hooks/useSocket';
import { ERoutes } from '@constants/routes';
import AlertBell from '../_components/AlertBell';
import ThemeToggle from '../_components/ThemeToggle';

interface Props {
  sidebar: ReactNode;
  children: ReactNode;
}

function DashboardLayout({ sidebar, children }: Props) {
  const { user, isGuest, signOut } = useAuth();
  const { isConnected } = useSocket();
  const navigate = useNavigate();

  const onLogout = () => {
    signOut();
    navigate(ERoutes.LOGIN, { replace: true });
  };

  const onSignIn = () => {
    signOut();
    navigate(ERoutes.LOGIN, { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-bg text-text lg:h-screen lg:min-h-0">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-bg/80 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-accent-soft">
              <Activity className="h-4 w-4 text-accent" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              Trading<span className="text-accent">Term</span>
            </span>
            <span className="ml-3 hidden items-center gap-1.5 text-xs text-text-dim sm:flex">
              <Circle
                className={cn(
                  'h-2 w-2',
                  isConnected
                    ? 'fill-up text-up'
                    : 'fill-text-dim text-text-dim',
                )}
              />
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
            {isGuest && (
              <span className="ml-2 inline-flex items-center gap-1 rounded border border-accent/40 bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                <UserCircle2 className="h-3 w-3" />
                Guest mode
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            {!isGuest && <AlertBell />}
            <span className="num hidden text-xs text-text-dim md:ml-1 md:inline">
              {isGuest ? 'Browsing as guest' : user?.email}
            </span>
            {isGuest ? (
              <Button variant="primary" size="sm" onClick={onSignIn}>
                <LogIn className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign in</span>
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={onLogout}>
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Body — sidebar + main
          Below lg the vertical sidebar is hidden and the MobileTickerStrip
          (rendered as part of children) takes over for navigation. On lg+
          the sidebar shows alongside the chart in the classic dashboard layout. */}
      <div className="flex flex-1 flex-col lg:flex-row lg:overflow-hidden">
        <aside className="hidden w-80 max-w-80 shrink-0 overflow-y-auto border-r border-border bg-surface lg:block">
          {sidebar}
        </aside>
        <main className="flex min-h-0 flex-1 flex-col lg:overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
