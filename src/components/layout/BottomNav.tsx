'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CarrotIcon, CookingPotIcon, HouseIcon, ShoppingCartIcon, StarIcon, TagIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAgrocer } from '@/providers/AgrocerProvider';

const tabs = [
  { href: '/', label: 'Home', icon: HouseIcon, exact: true },
  { href: '/pantry', label: 'Pantry', icon: CarrotIcon, exact: false },
  { href: '/shopping', label: 'Shopping', icon: ShoppingCartIcon, exact: false },
  { href: '/meals', label: 'Meals', icon: CookingPotIcon, exact: false },
  { href: '/products', label: 'Products', icon: StarIcon, exact: false },
  { href: '/specials', label: 'Specials', icon: TagIcon, exact: false },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { shopping, hydrated } = useAgrocer();
  // Until the load resolves, `shopping` still holds the demo seed. Against localStorage that
  // window was imperceptible; over the network it is long enough to show a badge counting
  // items the family does not have. No badge is better than a wrong one.
  const remaining = hydrated ? shopping.filter((item) => !item.checked).length : 0;

  // Shopping Mode is full-screen by design: in the aisle the family only needs
  // the list, and its own Exit button is the way back.
  if (pathname.startsWith('/shopping/mode')) return null;

  return (
    <nav
      aria-label="Primary"
      className="relative z-30 shrink-0 border-t border-line bg-surface/95 px-2 pt-2 backdrop-blur"
      style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
    >
      <ul className="flex items-stretch">
        {tabs.map((tab) => {
          const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative flex h-full flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-semibold transition-colors duration-150 ease-out',
                  isActive ? 'text-moss-700' : 'text-muted hover:text-ink',
                )}
              >
                <span
                  className={cn(
                    'relative flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-150 ease-out',
                    isActive && 'bg-moss-50',
                  )}
                >
                  <Icon className="h-[19px] w-[19px]" strokeWidth={isActive ? 2.4 : 1.9} />
                  {tab.label === 'Shopping' && remaining > 0 ? (
                    <span className="absolute -right-0.5 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-clay-500 px-1 text-[10px] font-bold text-white">
                      {remaining}
                    </span>
                  ) : null}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
