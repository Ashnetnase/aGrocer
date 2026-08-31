'use client';

import { useMemo, useState } from 'react';
import { AlertTriangleIcon, XIcon } from 'lucide-react';
import { parseNewWorldOrderBatch, type ImportedOrder } from '@/domain/services/orderImport';
import type { OrderLineItemDraft } from '@/domain/schemas/orderHistory';
import { BottomSheet } from '@/components/agrocer/BottomSheet';
import { nzd } from '@/lib/format';

interface OrderImportSheetProps {
  open: boolean;
  onClose: () => void;
  onImport: (drafts: OrderLineItemDraft[]) => Promise<void>;
}

/**
 * Paste one or several New World order confirmations/invoices, review what was read, then save.
 *
 * Same shape as `RecipeImportSheet`: paste, parse, **review**, confirm. Nothing is saved until
 * the person presses Save — a wrong quantity here becomes a wrong "common order" suggestion
 * forever, so the review step matters at least as much as it does for a recipe.
 *
 * A paste can cover more than one order — a batch of confirmation emails, say —
 * `parseNewWorldOrderBatch` splits those apart, and each keeps its own editable date here.
 *
 * The parser never reads a customer name, address or phone number out of the pasted text, so
 * none can appear here to review in the first place.
 */
export function OrderImportSheet({ open, onClose, onImport }: OrderImportSheetProps) {
  const [text, setText] = useState('');
  const [dateOverrides, setDateOverrides] = useState<Record<number, string>>({});
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  const orders: ImportedOrder[] = useMemo(
    () => (text.trim() ? parseNewWorldOrderBatch(text) : []),
    [text],
  );

  const dateFor = (orderIndex: number, order: ImportedOrder) => dateOverrides[orderIndex] ?? order.orderedOn ?? '';

  const survivingLines = orders.flatMap((order, orderIndex) =>
    order.lines
      .map((line, lineIndex) => ({ order, orderIndex, line, key: `${orderIndex}-${lineIndex}` }))
      .filter((entry) => !removed.has(entry.key)),
  );
  const missingDates = orders.some((order, orderIndex) => !dateFor(orderIndex, order));
  const totalLines = survivingLines.length;

  function reset() {
    setText('');
    setDateOverrides({});
    setRemoved(new Set());
    setError(undefined);
    setSaved(false);
  }

  async function save() {
    if (!totalLines || missingDates || saving) return;
    setSaving(true);
    setError(undefined);
    try {
      const drafts: OrderLineItemDraft[] = survivingLines.map(({ order, orderIndex, line }) => ({
        retailer: 'new-world',
        name: line.name,
        quantity: line.quantity,
        unit: line.unit,
        unitPrice: line.unitPrice,
        totalPrice: line.totalPrice,
        orderedOn: dateFor(orderIndex, order),
      }));
      await onImport(drafts);
      setSaved(true);
      window.setTimeout(() => {
        reset();
        onClose();
      }, 1200);
    } catch (caught) {
      const detail = caught instanceof Error ? caught.message : undefined;
      setError(detail ? `Could not save these orders: ${detail}` : 'Could not save these orders. Check the connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Import past orders"
      description="Paste one or more New World order confirmations or invoices. You'll check what was read before anything is saved."
      footer={
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => {
              reset();
              onClose();
            }}
            className="h-12 flex-1 rounded-2xl border border-line bg-canvas text-[15px] font-bold text-ink transition-colors duration-150 ease-out hover:bg-line"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={!totalLines || missingDates || saving}
            className="h-12 flex-1 rounded-2xl bg-moss-600 text-[15px] font-bold text-white transition-colors duration-150 ease-out hover:bg-moss-700 disabled:cursor-not-allowed disabled:bg-line"
          >
            {saving ? 'Saving…' : saved ? 'Saved' : `Save ${totalLines || ''} item${totalLines === 1 ? '' : 's'}`.trim()}
          </button>
        </div>
      }
    >
      <textarea
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setRemoved(new Set());
          setDateOverrides({});
        }}
        rows={8}
        aria-label="Order confirmation or invoice text"
        placeholder="Paste one or more order confirmation emails or invoices here…"
        className="w-full resize-y rounded-2xl border border-line bg-canvas p-3.5 text-[13px] leading-relaxed text-ink placeholder:text-muted focus:border-moss-400 focus:outline-none focus:ring-2 focus:ring-moss-100"
      />

      {orders.length > 0 ? (
        <div className="mt-4 space-y-4">
          {orders.map((order, orderIndex) => (
            <div key={orderIndex} className="rounded-2xl border border-line p-3">
              {orders.length > 1 ? (
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
                  Order {orderIndex + 1} of {orders.length}
                </p>
              ) : null}

              <label className="block text-xs font-bold text-muted" htmlFor={`order-date-${orderIndex}`}>
                Order date
              </label>
              <input
                id={`order-date-${orderIndex}`}
                type="date"
                value={dateFor(orderIndex, order)}
                onChange={(event) =>
                  setDateOverrides((current) => ({ ...current, [orderIndex]: event.target.value }))
                }
                className="mt-1 h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink focus:border-moss-400 focus:outline-none focus:ring-2 focus:ring-moss-100"
              />
              {!order.orderedOn ? (
                <p className="mt-1 text-xs text-muted">No date was found for this order — set it by hand.</p>
              ) : null}

              {order.lines.length > 0 ? (
                <>
                  <p className="mt-3 text-[13px] font-bold text-ink">
                    Read {order.lines.length} item{order.lines.length === 1 ? '' : 's'}
                  </p>
                  <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto">
                    {order.lines.map((line, lineIndex) => {
                      const key = `${orderIndex}-${lineIndex}`;
                      return removed.has(key) ? null : (
                        <li
                          key={key}
                          className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm"
                        >
                          <span className="min-w-0 flex-1 truncate text-ink">
                            {line.quantity} {line.unit} · {line.name}
                          </span>
                          <span className="shrink-0 text-xs font-semibold text-muted">{nzd(line.totalPrice)}</span>
                          <button
                            type="button"
                            onClick={() => setRemoved((current) => new Set(current).add(key))}
                            aria-label={`Remove ${line.name}`}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-berry-50 hover:text-berry-500"
                          >
                            <XIcon className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : (
                <p className="mt-3 text-sm font-semibold text-clay-600">
                  No order lines were recognised in this order.
                </p>
              )}

              {order.unparsed.length > 0 ? (
                <div className="mt-3 rounded-xl bg-canvas p-3">
                  <p className="flex items-center gap-1.5 text-[13px] font-bold text-clay-600">
                    <AlertTriangleIcon className="h-4 w-4 shrink-0" aria-hidden />
                    {order.unparsed.length} line{order.unparsed.length === 1 ? '' : 's'} looked priced but
                    couldn&rsquo;t be read — not imported
                  </p>
                  <ul className="mt-1.5 space-y-0.5">
                    {order.unparsed.slice(0, 10).map((line, index) => (
                      <li key={`${line}-${index}`} className="truncate text-xs text-muted">
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Only product lines are read — names, quantities and prices. Nothing else in the pasted
          text (your name, address, phone or order number) is ever extracted.
          {text.trim() ? ' No order lines were recognised in that text.' : ''}
        </p>
      )}

      {error ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-berry-600">
          {error}
        </p>
      ) : null}
    </BottomSheet>
  );
}
