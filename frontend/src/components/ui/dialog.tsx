import { useState, type ReactNode } from "react";
import { Button } from "./button";

export function ConfirmDialog({
  title,
  description,
  trigger,
  onConfirm,
  confirmLabel = "Confirm",
}: {
  title: string;
  description: string;
  trigger: ReactNode;
  onConfirm: () => void | Promise<void>;
  confirmLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-slate-600">{description}</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await onConfirm();
                  setBusy(false);
                  setOpen(false);
                }}
              >
                {confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function Modal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="text-slate-400 hover:text-slate-700" onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
