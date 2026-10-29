"use client";

import { useActionState, useState } from "react";
import { login } from "@/features/auth/actions";
import { idleAction } from "@/features/action-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { Notice } from "@/components/ui/notice";
import { DEMO_ACCOUNTS } from "@/lib/demo/ids";

export function LoginForm({ demonstration, password }: { demonstration: boolean; password: string | null }) {
  const [state, action] = useActionState(login, idleAction);
  const [email, setEmail] = useState(demonstration ? DEMO_ACCOUNTS[0].email : "");
  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm font-semibold" htmlFor="email">
        E-mail
        <input id="email" name="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className="field mt-2" />
      </label>
      <label className="block text-sm font-semibold" htmlFor="password">
        Senha
        <input id="password" name="password" type="password" autoComplete="current-password" required defaultValue={demonstration ? password ?? "" : ""} className="field mt-2" />
      </label>
      {state.message ? <Notice tone="danger">{state.message}</Notice> : null}
      <SubmitButton pendingLabel="Entrando…">Entrar</SubmitButton>
      {demonstration && password ? (
        <div className="rounded-2xl border border-amber-200 bg-warning-soft p-4 text-sm text-warning">
          <p className="font-semibold">Contas fictícias desta instância</p>
          <p className="mt-1">A senha abaixo existe só neste ambiente de demonstração. Nenhum e-mail real é usado.</p>
          <p className="mt-2 font-mono text-base text-ink">{password}</p>
          <div className="mt-3 grid gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button key={account.email} type="button" className="rounded-xl bg-white px-3 py-2 text-left text-ink" onClick={() => setEmail(account.email)}>
                <span className="block font-semibold">{account.clinic}</span>
                <span className="text-muted">{account.email} · {account.role}. {account.note}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </form>
  );
}
