'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const AUTH_UTILITY_PATHS = ['/reset-password', '/update-password'];

export default function BottomNav() {
  const pathname = usePathname();

  if (AUTH_UTILITY_PATHS.includes(pathname)) return null;

  const navItems = [
    { href: '/', label: 'Today', icon: '🏠' },
    { href: '/discover', label: 'Discover', icon: '🔍' },
    { href: '/challenges', label: 'Challenges', icon: '⚡' },
    { href: '/profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-canvas)]">
      <div className="mx-auto max-w-[430px] [padding-bottom:env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-2 py-3 text-sm font-medium transition-colors ${
                pathname === item.href
                  ? 'text-[var(--color-brand-primary)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
