import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { XIcon } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const EASE = [0.23, 1, 0.32, 1] as const;

export function BottomSheet({ open, onClose, title, description, children, footer }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ?
      <div className="absolute inset-0 z-50 flex flex-col justify-end">
          <motion.button
          type="button"
          aria-label="Close"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: EASE }}
          className="absolute inset-0 h-full w-full cursor-default bg-ink/35" />
        
          <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.28, ease: EASE }}
          className="relative flex max-h-[86%] flex-col rounded-t-3xl bg-surface shadow-sheet">
          
            <div className="flex items-start gap-3 px-5 pb-3 pt-4">
              <div className="min-w-0 flex-1">
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" aria-hidden="true" />
                <h2 className="text-lg font-bold tracking-tight text-ink">{title}</h2>
                {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
              </div>
              <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="mt-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-canvas text-muted transition-colors duration-150 ease-out hover:bg-line hover:text-ink">
              
                <XIcon className="h-[18px] w-[18px]" strokeWidth={2} />
              </button>
            </div>
            <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-5">{children}</div>
            {footer ? <div className="border-t border-line bg-surface px-5 pb-6 pt-4">{footer}</div> : null}
          </motion.div>
        </div> :
      null}
    </AnimatePresence>);

}