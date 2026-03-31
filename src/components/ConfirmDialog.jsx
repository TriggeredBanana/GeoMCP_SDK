import { useEffect } from 'react';

/**
 * ConfirmDialog
 *
 * A modal confirmation dialog rendered via a fixed overlay.
 *
 * Props:
 *   title         — Optional heading text
 *   message       — Body text (required)
 *   confirmLabel  — Label for the destructive/confirm button (default: "Bekreft")
 *   cancelLabel   — Label for the cancel button (default: "Avbryt")
 *   onConfirm()   — Called when the user confirms
 *   onCancel()    — Called when the user cancels or presses Escape
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Bekreft',
  cancelLabel = 'Avbryt',
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  return (
    <div
      className="confirm-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'confirm-title' : undefined}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="confirm-dialog">
        {title && <h3 className="confirm-title" id="confirm-title">{title}</h3>}
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="confirm-btn confirm-btn--cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="confirm-btn confirm-btn--danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
