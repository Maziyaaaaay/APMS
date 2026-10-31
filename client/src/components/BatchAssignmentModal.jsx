import React, { useEffect, useMemo, useState } from 'react';

const EMPTY_BATCHES = [];

export default function BatchAssignmentModal({
  open,
  title = 'Choose your student batches',
  description = 'Select the admission batches you are responsible for. Student approvals and reviews will be routed to their assigned faculty advisor.',
  initialBatches = EMPTY_BATCHES,
  onCancel,
  onConfirm,
  submitLabel = 'Confirm batches',
  busy = false,
  cancelDisabled = false,
  multiple = true,
}) {
  const [selected, setSelected] = useState(initialBatches);
  const years = useMemo(() => {
    const thisYear = new Date().getFullYear();
    return Array.from({ length: 9 }, (_, index) => thisYear - 7 + index);
  }, []);

  const initialKey = JSON.stringify(initialBatches || []);
  useEffect(() => {
    if (open) setSelected(JSON.parse(initialKey));
  }, [open, initialKey]);

  if (!open) return null;
  const toggle = (year) => setSelected(current => {
    if (current.includes(year)) return current.filter(value => value !== year);
    return multiple ? [...current, year].sort((a, b) => a - b) : [year];
  });

  return (
    <div className="modal-overlay" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="batch-assignment-title" style={{ width: 'min(100%, 520px)' }}>
        <div className="modal-header">
          <div>
            <span className="form-eyebrow">FACULTY SETUP</span>
            <h3 id="batch-assignment-title">{title}</h3>
          </div>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 18 }}>{description}</p>
          <div role="group" aria-label="Student admission batches" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))', gap: 9 }}>
            {years.map(year => {
              const active = selected.includes(year);
              return <button
                key={year}
                type="button"
                aria-pressed={active}
                disabled={busy}
                onClick={() => toggle(year)}
                className={active ? 'btn btn-primary' : 'btn btn-outline'}
                style={{ minHeight: 46, justifyContent: 'center' }}
              >{year} batch</button>;
            })}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 16 }}>
            Each batch can have one responsible faculty advisor. Your assignment will be checked before it is saved.
          </p>
        </div>
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          {!cancelDisabled && <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>}
          <button type="button" className="btn btn-primary" onClick={() => onConfirm(selected)} disabled={busy || selected.length === 0}>
            {busy ? 'Saving…' : submitLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
