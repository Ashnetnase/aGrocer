import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightIcon,
  BellIcon,
  CalendarPlusIcon,
  ChevronRightIcon,
  ClockIcon,
  PlusIcon,
  ShoppingCartIcon,
  UsersIcon } from
'lucide-react';
import { useAgrocer } from '../contexts/AgrocerContext';
import { household, householdName } from '../data/household';
import { days, todayKey } from '../data/meals';
import { StockChip } from '../components/ui/StockChip';
import { nzd } from '../utils/format';

export function Home() {
  const navigate = useNavigate();
  const { pantry, shopping, plan, getMeal, addShoppingItem } = useAgrocer();

  const tonight = getMeal(plan[todayKey]?.dinner);
  const alerts = pantry.filter((item) => item.state !== 'good');
  const remaining = shopping.filter((item) => !item.checked);
  const total = shopping.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const progress = shopping.length ? (shopping.length - remaining.length) / shopping.length * 100 : 0;
  const todayIndex = days.findIndex((day) => day.key === todayKey);

  return (
    <>
      <header className="shrink-0 bg-canvas px-5 pb-2 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-moss-600 text-base font-extrabold text-white">
              a
            </span>
            <div>
              <p className="text-[19px] font-extrabold leading-none tracking-tight text-ink">Agrocer</p>
              <p className="mt-1 text-[11px] font-medium text-muted">Meals, pantry and groceries</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors duration-150 ease-out hover:bg-moss-50">
            
            <BellIcon className="h-[18px] w-[18px]" />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-clay-500" />
          </button>
        </div>
      </header>

      <main className="no-scrollbar flex-1 overflow-y-auto px-5 pb-8 pt-3">
        <div className="flex items-center justify-between rounded-2xl border border-line bg-surface px-3.5 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex -space-x-2">
              {household.map((member) =>
              <span
                key={member.id}
                title={`${member.name} · ${member.role}`}
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface text-[11px] font-bold text-white ${member.colour}`}>
                
                  {member.initials}
                </span>
              )}
            </div>
            <div>
              <p className="text-sm font-bold leading-none text-ink">{householdName}</p>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-muted">
                <UsersIcon className="h-3 w-3" /> 5 in the house
              </p>
            </div>
          </div>
          <button type="button" className="text-xs font-semibold text-moss-700">
            Switch
          </button>
        </div>

        <section aria-labelledby="tonight" className="mt-5">
          <div className="mb-2.5 flex items-baseline justify-between">
            <h2 id="tonight" className="text-base font-bold tracking-tight text-ink">
              Tonight’s dinner
            </h2>
            <span className="text-xs font-medium text-muted">Wednesday 26 Aug</span>
          </div>
          {tonight ?
          <button
            type="button"
            onClick={() => navigate('/meals')}
            className="group relative block w-full overflow-hidden rounded-3xl text-left shadow-card">
            
              <img src={tonight.image} alt="" className="h-48 w-full object-cover" />
              <div className="absolute inset-0 bg-ink/45" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <div className="flex flex-wrap gap-1.5">
                  {tonight.tags.map((tag) =>
                <span
                  key={tag}
                  className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                  
                      {tag}
                    </span>
                )}
                </div>
                <p className="mt-2 text-2xl font-extrabold leading-tight tracking-tight text-white">{tonight.name}</p>
                <div className="mt-1.5 flex items-center gap-3 text-[13px] font-medium text-white/85">
                  <span className="flex items-center gap-1">
                    <ClockIcon className="h-3.5 w-3.5" /> {tonight.minutes} min
                  </span>
                  <span className="flex items-center gap-1">
                    <UsersIcon className="h-3.5 w-3.5" /> Serves {tonight.serves}
                  </span>
                </div>
              </div>
              <span className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink">
                <ArrowRightIcon className="h-4 w-4" />
              </span>
            </button> :

          <button
            type="button"
            onClick={() => navigate('/meals')}
            className="flex w-full items-center justify-center gap-2 rounded-3xl border border-dashed border-line bg-surface/70 py-10 text-sm font-semibold text-moss-700">
            
              <CalendarPlusIcon className="h-4 w-4" /> Nothing planned — pick tonight’s meal
            </button>
          }
        </section>

        <section aria-label="Quick actions" className="mt-5 grid grid-cols-3 gap-2.5">
          {[
          { label: 'Add pantry', icon: PlusIcon, to: '/pantry' },
          { label: 'Add to shop', icon: ShoppingCartIcon, to: '/shopping' },
          { label: 'Plan a meal', icon: CalendarPlusIcon, to: '/meals' }].
          map((action) =>
          <button
            key={action.label}
            type="button"
            onClick={() => navigate(action.to, { state: { add: true } })}
            className="flex flex-col items-start gap-2 rounded-2xl border border-line bg-surface p-3 text-left transition-colors duration-150 ease-out hover:border-moss-200 hover:bg-moss-50">
            
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-moss-50 text-moss-700">
                <action.icon className="h-4 w-4" />
              </span>
              <span className="text-[12.5px] font-semibold leading-tight text-ink">{action.label}</span>
            </button>
          )}
        </section>

        <section aria-labelledby="alerts" className="mt-6">
          <div className="mb-2.5 flex items-baseline justify-between">
            <h2 id="alerts" className="text-base font-bold tracking-tight text-ink">
              Pantry alerts
            </h2>
            <button type="button" onClick={() => navigate('/pantry')} className="text-xs font-semibold text-moss-700">
              View pantry
            </button>
          </div>
          <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {alerts.slice(0, 4).map((item) => {
              const alreadyListed = shopping.some(
                (s) => s.name.toLowerCase() === item.name.toLowerCase() && !s.checked
              );
              return (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-ink">{item.name}</p>
                    <p className="truncate text-xs text-muted">{item.note ?? `${item.quantity} ${item.unit} left`}</p>
                  </div>
                  <StockChip state={item.state} size="sm" />
                  <button
                    type="button"
                    disabled={alreadyListed}
                    onClick={() =>
                    addShoppingItem({
                      name: item.name,
                      category: item.category,
                      quantity: 1,
                      unit: item.unit,
                      price: 4.5,
                      priority: item.state === 'out'
                    })
                    }
                    aria-label={`Add ${item.name} to shopping list`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-moss-50 text-moss-700 transition-colors duration-150 ease-out hover:bg-moss-100 disabled:bg-canvas disabled:text-muted">
                    
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>);

            })}
            {alerts.length > 4 ?
            <button
              type="button"
              onClick={() => navigate('/pantry')}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-moss-700">
              
                {alerts.length - 4} more running low
                <ChevronRightIcon className="h-4 w-4" />
              </button> :
            null}
          </div>
        </section>

        <section aria-labelledby="shopping-summary" className="mt-6">
          <h2 id="shopping-summary" className="sr-only">
            Shopping list summary
          </h2>
          <button
            type="button"
            onClick={() => navigate('/shopping')}
            className="block w-full rounded-3xl border border-line bg-surface p-4 text-left shadow-card transition-colors duration-150 ease-out hover:border-moss-200">
            
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-muted">Shopping list</p>
                <p className="mt-0.5 text-[22px] font-extrabold leading-tight tracking-tight text-ink">
                  {remaining.length} items to buy
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-muted">Estimated</p>
                <p className="mt-0.5 text-[22px] font-extrabold leading-tight tracking-tight text-moss-700">
                  {nzd(total)}
                </p>
              </div>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-canvas">
              <div className="h-full rounded-full bg-moss-500" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted">
              {shopping.length - remaining.length} of {shopping.length} already in the trolley
            </p>
          </button>
        </section>

        <section aria-labelledby="week" className="mt-6">
          <div className="mb-2.5 flex items-baseline justify-between">
            <h2 id="week" className="text-base font-bold tracking-tight text-ink">
              This week
            </h2>
            <button type="button" onClick={() => navigate('/meals')} className="text-xs font-semibold text-moss-700">
              Open planner
            </button>
          </div>
          <div className="no-scrollbar -mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1">
            {days.slice(todayIndex).concat(days.slice(0, todayIndex)).map((day) => {
              const meal = getMeal(plan[day.key]?.dinner);
              const isToday = day.key === todayKey;
              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => navigate('/meals')}
                  className={`w-[132px] shrink-0 overflow-hidden rounded-2xl border text-left transition-colors duration-150 ease-out ${
                  isToday ? 'border-moss-300 bg-moss-50' : 'border-line bg-surface'}`
                  }>
                  
                  {meal ?
                  <img src={meal.image} alt="" className="h-16 w-full object-cover" /> :

                  <div className="flex h-16 w-full items-center justify-center bg-canvas text-muted">
                      <CalendarPlusIcon className="h-4 w-4" />
                    </div>
                  }
                  <div className="p-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                      {isToday ? 'Tonight' : day.short}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-snug text-ink">
                      {meal ? meal.name : 'Not planned'}
                    </p>
                  </div>
                </button>);

            })}
          </div>
        </section>
      </main>
    </>);

}