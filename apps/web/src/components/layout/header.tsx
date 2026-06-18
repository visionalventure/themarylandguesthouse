'use client';

import { useEffect, useState, useCallback } from 'react';
import { Bell, Search, Moon, Sun, Menu, LogOut, User, Settings, CheckCheck, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useTheme } from 'next-themes';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { notificationsApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { GlobalSearch } from './global-search';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

const typeIcon: Record<string, React.ReactNode> = {
  INFO: <Info className="w-4 h-4 text-blue-500" />,
  WARNING: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  SUCCESS: <CheckCircle className="w-4 h-4 text-emerald-500" />,
  ERROR: <XCircle className="w-4 h-4 text-destructive" />,
};

interface HeaderProps {
  onMenuToggle: () => void;
  title?: string;
}

export function Header({ onMenuToggle, title }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationsApi.list();
      setNotifications(res.data.notifications ?? []);
      setUnreadCount(res.data.unreadCount ?? 0);
    } catch {
      // silently ignore — notifications are non-critical
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    const onFocus = () => fetchNotifications();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchNotifications]);

  const handleMarkRead = async (id: string) => {
    await notificationsApi.markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : 'U';

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <header className="h-16 bg-luxury-charcoal/90 backdrop-blur-glass border-b border-white/[0.06] flex items-center justify-between px-4 gap-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onMenuToggle}>
          <Menu className="w-5 h-5" />
        </Button>

        {title && (
          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          </div>
        )}
      </div>

      {/* Global Search */}
      <div className="flex-1 max-w-md hidden md:block">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          suppressHydrationWarning
        >
          {mounted ? (
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={theme}
                initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="inline-flex"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </motion.span>
            </AnimatePresence>
          ) : (
            <span className="w-5 h-5" />
          )}
        </Button>

        {/* Notifications dropdown */}
        <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
          <DropdownMenuTrigger asChild>
            <div className="relative">
              <Button variant="ghost" size="icon">
                <Bell className="w-5 h-5" />
              </Button>
              {unreadCount > 0 && (
                <Badge
                  className="absolute -top-1 -right-1 h-4 min-w-4 px-1 flex items-center justify-center text-[10px] pointer-events-none"
                  variant="destructive"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold">Notifications</span>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 text-muted-foreground"
                  onClick={handleMarkAllRead}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </Button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No notifications</p>
                </div>
              ) : (
                notifications.slice(0, 15).map(n => (
                  <button
                    key={n.id}
                    className={cn(
                      'w-full text-left px-4 py-3 flex gap-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0',
                      !n.isRead && 'bg-primary/5',
                    )}
                    onClick={() => handleMarkRead(n.id)}
                  >
                    <span className="shrink-0 mt-0.5">
                      {typeIcon[n.type] ?? typeIcon.INFO}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-sm leading-snug', !n.isRead && 'font-medium')}>{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                  </button>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 h-9 pl-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={user?.avatarUrl} />
                <AvatarFallback className="bg-gold-main/20 text-gold-main text-xs font-semibold ring-1 ring-gold-main/30">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium leading-tight">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-muted-foreground leading-tight">{user?.role}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => router.push('/settings/profile')}>
              <User className="w-4 h-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
