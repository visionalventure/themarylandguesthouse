const KEY = 'mgh-recent-commands';
const MAX = 10;

export interface RecentCommand {
  id: string;
  label: string;
  href?: string;
  usedAt: number;
}

export function getRecentCommands(): RecentCommand[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function addRecentCommand(cmd: Omit<RecentCommand, 'usedAt'>) {
  if (typeof window === 'undefined') return;
  const existing = getRecentCommands().filter(c => c.id !== cmd.id);
  const updated = [{ ...cmd, usedAt: Date.now() }, ...existing].slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(updated));
}
