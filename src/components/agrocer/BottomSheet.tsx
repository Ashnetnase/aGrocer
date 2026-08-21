'use client';

import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { XIcon } from 'lucide-react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** The Magic Patterns easing and timing — this is the sheet's signature feel. */
const EASE = [0.23, 1, 0.32, 1] as const;

/**
 * The design's bottom sheet, with Radix Dialog underneath for the behaviour the
 * prototype lacked: focus trap, focus restore, scroll lock and correct dialog
 * semantics (ADR-006). The markup, motion and styling are unchanged.
 *
 * Deliberately not portalled — the sheet is positioned against the phone frame,
 * so it must stay inside it.
 */
export function BottomSheet({ open, onClose, title, description, children, footer }: BottomSheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <AnimatePresence>
        {open ? (
          <div className="absolute inset-0 z-50 flex flex-col justify-end">
            <Dialog.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: EASE }}
                className="absolute inset-0 h-full w-full bg-ink/35"
              />
            </Dialog.Overlay>

            <Dialog.Content asChild forceMount>
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ duration: 0.28, ease: EASE }}
                className="relative flex max-h-[86%] flex-col rounded-t-3xl bg-surface shadow-sheet focus:outline-none"
              >
                <div className="flex items-start gap-3 px-5 pb-3 pt-4">
                  <div className="min-w-0 flex-1">
                    <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" aria-hidden="true" />
                    <Dialog.Title className="text-lg font-bold tracking-tight text-ink">{title}</Dialog.Title>
                    {description ? (
                      <Dialog.Description className="mt-0.5 text-sm text-muted">{description}</Dialog.Description>
                    ) : (
                      <Dialog.Description className="sr-only">{title}</Dialog.Description>
                    )}
                  </div>
                  <Dialog.Close
                    aria-label="Close"
                    className="mt-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-canvas text-muted transition-colors duration-150 ease-out hover:bg-line hover:text-ink"
                  >
                    <XIcon className="h-[18px] w-[18px]" strokeWidth={2} />
                  </Dialog.Close>
                </div>

                <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-5">{children}</div>

                {footer ? (
                  <div
                    className="border-t border-line bg-surface px-5 pt-4"
                    style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
                  >
                    {footer}
                  </div>
                ) : null}
              </motion.div>
            </Dialog.Content>
          </div>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}
