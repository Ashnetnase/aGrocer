import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircle2Icon, ChevronDownIcon, PlusIcon, ScanLineIcon, ShoppingBasketIcon, XIcon } from 'lucide-react';
import { useAgrocer } from '../contexts/AgrocerContext';
import { ScreenHeader } from '../components/ScreenHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { ShoppingRow } from '../components/shopping/ShoppingRow';
import { ShoppingItemSheet } from '../components/shopping/ShoppingItemSheet';
import { CATEGORIES, ShoppingItem } from '../types';
import { nzd } from '../utils/format';

export function Shopping() {
  const location = useLocation() as {state?: {add?: boolean;};};
  const {
    shopping,
    shoppingMode,
    setShoppingMode,
    toggleShoppingItem,
    addShoppingItem,
    updateShoppingItem,
    removeShoppingItem,
    clearChecked
  } = useAgrocer();
  const [sheetOpen, setSheetOpen] = useState(Boolean(location.state?.add));
  const [editing, setEditing] = useState<ShoppingItem | null>(null);
  const [showTrolley, setShowTrolley] = useState(false);

  const remaining = shopping.filter((item) => !item.checked);
  const checked = shopping.filter((item) => item.checked);
  const total = shopping.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const trolleyTotal = checked.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const progress = shopping.length ? checked.length / shopping.length * 100 : 0;

  const groups = useMemo(() => {
    const source = shoppingMode ? remaining : shopping;
    return CATEGORIES.map((category) => ({
      category,
      items: source.filter((item) => item.category === category)
    })).filter((group) => group.items.length > 0);
  }, [shopping, shoppingMode, remaining]);

  const openAdd = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const rows = (items: ShoppingItem[]) =>
  items.map((item) =>
  <ShoppingRow
    key={item.id}
    item={item}
    shoppingMode={shoppingMode}
    onToggle={() => toggleShoppingItem(item.id)}
    onEdit={() => {
      setEditing(item);
      setSheetOpen(true);
    }} />

  );

  return (
    <>
      {shoppingMode ?
      <header className="shrink-0 bg-moss-700 px-5 pb-4 pt-6 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-moss-200">
                <ScanLineIcon className="h-3.5 w-3.5" /> Shopping mode
              </p>
              <p className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight">
                {remaining.length} left to grab
              </p>
              <p className="mt-0.5 text-sm text-moss-100">
                {nzd(trolleyTotal)} in trolley · {nzd(total)} estimated
              </p>
            </div>
            <button
            type="button"
            onClick={() => setShoppingMode(false)}
            className="flex h-10 items-center gap-1.5 rounded-full bg-white/15 px-3.5 text-sm font-semibold transition-colors duration-150 ease-out hover:bg-white/25">
            
              <XIcon className="h-4 w-4" /> Exit
            </button>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
          </div>
        </header> :

      <ScreenHeader title="Shopping" subtitle={`${remaining.length} to buy · New World Thursday`}>
          <div className="rounded-3xl border border-line bg-surface p-4 shadow-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-muted">In the trolley</p>
                <p className="mt-0.5 text-[22px] font-extrabold leading-tight tracking-tight text-ink">
                  {checked.length} of {shopping.length}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-muted">Estimated total</p>
                <p className="mt-0.5 text-[22px] font-extrabold leading-tight tracking-tight text-moss-700">
                  {nzd(total)}
                </p>
              </div>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-canvas">
              <div className="h-full rounded-full bg-moss-500" style={{ width: `${progress}%` }} />
            </div>
            <button
            type="button"
            onClick={() => setShoppingMode(true)}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-moss-600 text-[15px] font-bold text-white transition-colors duration-150 ease-out hover:bg-moss-700">
            
              <ShoppingBasketIcon className="h-[18px] w-[18px]" /> Start shopping mode
            </button>
          </div>
        </ScreenHeader>
      }

      <main className={`no-scrollbar relative flex-1 overflow-y-auto px-5 pb-24 ${shoppingMode ? 'pt-4' : 'pt-4'}`}>
        {shopping.length === 0 ?
        <EmptyState
          icon={ShoppingBasketIcon}
          title="Nothing on the list"
          body="Add what the family needs, or pull staples straight from your Products list."
          actionLabel="Add an item"
          onAction={openAdd} /> :

        shoppingMode && remaining.length === 0 ?
        <EmptyState
          icon={CheckCircle2Icon}
          title="That’s everything"
          body={`All ${checked.length} items are in the trolley — ${nzd(trolleyTotal)} estimated. Nice work.`}
          actionLabel="Finish and clear list"
          onAction={() => {
            clearChecked();
            setShoppingMode(false);
          }} /> :


        <div className={shoppingMode ? 'space-y-4' : 'space-y-5'}>
            {groups.map((group) =>
          <section key={group.category} aria-label={group.category}>
                <h2
              className={`mb-2 px-1 font-bold uppercase tracking-wider text-muted ${
              shoppingMode ? 'text-xs' : 'text-[11px]'}`
              }>
              
                  {group.category}
                </h2>
                <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
                  {rows(group.items)}
                </div>
              </section>
          )}
          </div>
        }

        {shoppingMode && checked.length > 0 ?
        <section className="mt-5" aria-label="In the trolley">
            <button
            type="button"
            onClick={() => setShowTrolley(!showTrolley)}
            aria-expanded={showTrolley}
            className="flex w-full items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3">
            
              <span className="text-sm font-semibold text-ink">In the trolley · {checked.length}</span>
              <ChevronDownIcon
              className={`h-4 w-4 text-muted transition-transform duration-200 ease-out ${
              showTrolley ? 'rotate-180' : ''}`
              } />
            
            </button>
            {showTrolley ?
          <div className="mt-2 divide-y divide-line overflow-hidden rounded-2xl border border-line opacity-70">
                {rows(checked)}
              </div> :
          null}
          </section> :
        null}

        {!shoppingMode && checked.length > 0 ?
        <button
          type="button"
          onClick={clearChecked}
          className="mt-5 w-full rounded-2xl border border-line bg-surface py-3 text-sm font-semibold text-muted transition-colors duration-150 ease-out hover:text-ink">
          
            Clear {checked.length} bought items
          </button> :
        null}
      </main>

      {!shoppingMode ?
      <button
        type="button"
        onClick={openAdd}
        aria-label="Add shopping item"
        className="absolute bottom-24 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-2xl bg-moss-600 text-white shadow-lift transition-colors duration-150 ease-out hover:bg-moss-700">
        
          <PlusIcon className="h-6 w-6" />
        </button> :
      null}

      <ShoppingItemSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        item={editing}
        onSave={(values) => {
          if (editing) updateShoppingItem(editing.id, values);else
          addShoppingItem(values);
        }}
        onDelete={editing ? () => removeShoppingItem(editing.id) : undefined} />
      
    </>);

}