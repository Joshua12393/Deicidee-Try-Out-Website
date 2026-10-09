"use client";
import { useActionState, useState } from "react";
import { reviewPublication, type PublicationReviewState } from "@/app/admin/publication-actions";
export function PublicationReviewForm({ id, revision, stale, own }: { id: string; revision: number; stale: boolean; own: boolean }) {
  const [state, action, pending] = useActionState<PublicationReviewState, FormData>(reviewPublication, { message: "" });
  const [note, setNote] = useState(state.note ?? "");
  if (state.success) return <p className="notice" role="status">{state.message}</p>;
  return <form action={action} className="publication-review"><input type="hidden" name="id" value={id} /><input type="hidden" name="revision" value={revision} />
    {stale && <p className="notice">Settings changed after this request. Reject it with a note asking for an updated draft.</p>}
    {own && <p className="notice">Another admin must review a request you authored.</p>}
    <label className="field">Review note<textarea name="note" value={note} onChange={event => setNote(event.target.value)} required maxLength={1000} disabled={pending || own} /></label>
    <div className="actions"><button className="button" name="intent" value="approve" disabled={pending || stale || own}>Approve & publish</button><button className="button secondary" name="intent" value="reject" disabled={pending || own}>Reject request</button></div>{state.message && <p className="form-message" role="status">{state.message}</p>}
  </form>;
}
