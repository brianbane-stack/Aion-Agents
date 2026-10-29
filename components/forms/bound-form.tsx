"use client";

import { useActionState } from "react";
import { idleAction, type ActionState } from "@/features/action-state";
import { Notice } from "@/components/ui/notice";

export function BoundForm({
  action,
  children,
  className,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, idleAction);
  return (
    <form action={formAction} className={className}>
      {children}
      {state.message ? <Notice tone={state.ok ? "success" : "danger"}>{state.message}</Notice> : null}
    </form>
  );
}
