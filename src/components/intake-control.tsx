"use client";
import { useActionState } from "react";
import { setIntake, type IntakeState } from "@/app/admin/actions";
export function IntakeControl({ version, open, ready }: { version: number; open: boolean; ready: boolean }) {
  const [state, action, pending] = useActionState<IntakeState, FormData>(setIntake, { version, open, message: "" });
  return <section className="panel"><h2>Application intake: {state.open ? "open" : "closed"}</h2><p>Open only after reviewing the published fields, privacy/retention policy, correction contact, Discord invite, and ready modes. Publishing or withdrawing settings automatically closes intake. Keep public intake closed until officer processing and release checks are ready.</p>{!ready && <p className="notice">The server submission service is not configured.</p>}<form action={action}><input type="hidden" name="version" value={state.version} /><input type="hidden" name="open" value={String(!state.open)} /><button className="button secondary" disabled={pending || (!state.open && !ready)}>{pending ? "Saving…" : state.open ? "Close applications" : "Open applications"}</button>{state.message && <p className="form-message" role="status">{state.message}</p>}</form></section>;
}
