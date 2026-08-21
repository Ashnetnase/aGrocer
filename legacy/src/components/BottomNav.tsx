import React from 'react';
import { NavLink } from 'react-router-dom';
import { CarrotIcon, CookingPotIcon, HouseIcon, ShoppingCartIcon, StarIcon } from 'lucide-react';
import { useAgrocer } from '../contexts/AgrocerContext';

const tabs = [
{ to: '/', label: 'Home', icon: HouseIcon, end: true },
{ to: '/pantry', label: 'Pantry', icon: CarrotIcon, end: false },
{ to: '/shopping', label: 'Shopping', icon: ShoppingCartIcon, end: false },
{ to: '/meals', label: 'Meals', icon: CookingPotIcon, end: false },
{ to: '/products', label: 'Products', icon: StarIcon, end: false }];


export function BottomNav() {
  const { shopping } = useAgrocer();
  const remaining = shopping.filter((item) => !item.checked).length;

  return (
    <nav
      aria-label="Primary"
      className="relative z-30 shrink-0 border-t border-line bg-surface/95 px-2 pb-5 pt-2 backdrop-blur">
      
      <ul className="flex items-stretch">
        {tabs.map((tab) =>
        <li key={tab.to} className="flex-1">
            <NavLink
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
            `relative flex h-full flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-semibold transition-colors duration-150 ease-out ${
            isActive ? 'text-moss-700' : 'text-muted hover:text-ink'}`

            }>
            
              {({ isActive }) =>
            <>
                  <span
                className={`relative flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-150 ease-out ${
                isActive ? 'bg-moss-50' : ''}`
                }>
                
                    <tab.icon className="h-[19px] w-[19px]" strokeWidth={isActive ? 2.4 : 1.9} />
                    {tab.label === 'Shopping' && remaining > 0 ?
                <span className="absolute -right-0.5 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-clay-500 px-1 text-[10px] font-bold text-white">
                        {remaining}
                      </span> :
                null}
                  </span>
                  {tab.label}
                </>
            }
            </NavLink>
          </li>
        )}
      </ul>
    </nav>);

}