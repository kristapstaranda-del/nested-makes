'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/discover', label: 'Discover', icon: '🔍' },
    { href: '/challenges', label: 'Challenges', icon: '⚡' },
    { href: '/profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-subtle bg-elevated">
      <div className="mx-auto max-w-[430px]">
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
