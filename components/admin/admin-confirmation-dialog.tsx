"use client";

import { useRef, useState } from "react";

interface Props { trigger: string; title: string; description: string; confirm: string; onConfirm: () => Promise<void>; danger?: boolean; }
export function AdminConfirmationDialog({ trigger, title, description, confirm, onConfirm, danger = false }: Props) {
  const ref = useRef<HTMLDialogElement>(null); const busyRef = useRef(false); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  async function run() { if (busyRef.current) return; busyRef.current = true; setBusy(true); setError(null); try { await onConfirm(); ref.current?.close(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to complete this operation."); } finally { busyRef.current = false; setBusy(false); } }
  return <><button className={danger ? "button button-danger" : "button button-primary"} onClick={() => ref.current?.showModal()} type="button">{trigger}</button><dialog className="confirmation-dialog" ref={ref} aria-labelledby="admin-confirm-title"><h2 id="admin-confirm-title">{title}</h2><p>{description}</p>{error ? <p className="form-error" role="alert">{error}</p> : null}<div className="dialog-actions"><button className="button button-secondary" disabled={busy} onClick={() => ref.current?.close()} type="button">Cancel</button><button className={danger ? "button button-danger" : "button button-primary"} disabled={busy} onClick={() => void run()} type="button">{busy ? "Processing…" : confirm}</button></div></dialog></>;
}
