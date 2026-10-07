"use client";
import { useActionState } from "react";
import { login } from "@/app/admin/actions";
export function LoginForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(login, { message: "" });
  return <form action={action} className="panel login-panel"><fieldset disabled={!configured || pending}><legend className="sr-only">Officer sign-in</legend><label className="field">Email<input name="email" type="email" autoComplete="username" maxLength={254} required /></label><label className="field">Password<input name="password" type="password" autoComplete="current-password" maxLength={256} required /></label><button className="button" type="submit" disabled={!configured || pending}>{pending ? "Signing in…" : "Sign in"}</button></fieldset><div aria-live="polite">{state.message && <p role="alert" className="form-message">{state.message}</p>}</div><p className="muted">No public registration. For access or password recovery, contact your clan administrator.</p></form>;
}
