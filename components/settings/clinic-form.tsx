"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { saveClinicAction } from "@/features/work/actions";
import { clinicSchema, linesToList } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";

const textSchema = clinicSchema.omit({ preferredPhrases: true, avoidedPhrases: true }).extend({
  preferredPhrases: z.string().max(1600),
  avoidedPhrases: z.string().max(1200),
});

type TextValues = z.infer<typeof textSchema>;

export function ClinicForm({
  defaults,
  onboarding = false,
  canEdit,
}: {
  defaults: TextValues;
  onboarding?: boolean;
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; message: string } | null>(null);
  const form = useForm<TextValues>({
    resolver: zodResolver(textSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (!form.formState.isDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [form.formState.isDirty]);

  function onSubmit(values: TextValues) {
    const parsed = clinicSchema.safeParse({
      ...values,
      preferredPhrases: linesToList(values.preferredPhrases),
      avoidedPhrases: linesToList(values.avoidedPhrases),
    });
    if (!parsed.success) {
      setMessage({ ok: false, message: parsed.error.issues[0]?.message || "Revise os campos." });
      return;
    }
    const data = new FormData();
    for (const [key, value] of Object.entries(parsed.data)) {
      data.set(key, Array.isArray(value) ? value.join("\n") : value);
    }
    if (onboarding) data.set("onboarding", "1");
    startTransition(async () => {
      const result = await saveClinicAction({ ok: true, message: "" }, data);
      if (result?.message) {
        setMessage(result);
        if (result.ok) form.reset(values);
      }
    });
  }

  const error = (name: keyof TextValues) => form.formState.errors[name]?.message;

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      {form.formState.isDirty ? (
        <Notice tone="warning">Há alterações ainda não salvas. Elas só entram em vigor depois de salvar.</Notice>
      ) : null}
      {message?.message ? <Notice tone={message.ok ? "success" : "danger"}>{message.message}</Notice> : null}
      <fieldset disabled={!canEdit || pending} className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-semibold md:col-span-2" htmlFor="name">
          Nome da clínica
          <input id="name" className="field mt-1" autoComplete="organization" aria-invalid={Boolean(error("name"))} {...form.register("name")} />
          {error("name") ? <span className="mt-1 block font-normal text-danger">{error("name")}</span> : null}
        </label>
        <label className="block text-sm font-semibold" htmlFor="phone">
          Telefone
          <input id="phone" className="field mt-1" autoComplete="tel" {...form.register("phone")} />
        </label>
        <label className="block text-sm font-semibold" htmlFor="email">
          E-mail
          <input id="email" type="email" className="field mt-1" autoComplete="email" aria-invalid={Boolean(error("email"))} {...form.register("email")} />
          {error("email") ? <span className="mt-1 block font-normal text-danger">{error("email")}</span> : null}
        </label>
        <label className="block text-sm font-semibold md:col-span-2" htmlFor="address">
          Endereço
          <input id="address" className="field mt-1" autoComplete="street-address" {...form.register("address")} />
        </label>
        <label className="block text-sm font-semibold" htmlFor="city">
          Cidade
          <input id="city" className="field mt-1" {...form.register("city")} />
        </label>
        <label className="block text-sm font-semibold" htmlFor="state">
          Estado
          <input id="state" className="field mt-1" {...form.register("state")} />
        </label>
        <label className="block text-sm font-semibold" htmlFor="technicalManager">
          Responsável técnico
          <input id="technicalManager" className="field mt-1" {...form.register("technicalManager")} />
        </label>
        <label className="block text-sm font-semibold" htmlFor="crmv">
          CRMV
          <input id="crmv" className="field mt-1" {...form.register("crmv")} />
        </label>
        <label className="block text-sm font-semibold" htmlFor="formality">
          Formalidade
          <select id="formality" className="field mt-1" {...form.register("formality")}>
            <option value="formal">Formal</option>
            <option value="cordial">Cordial</option>
            <option value="acolhedor">Acolhedor</option>
          </select>
        </label>
        <label className="block text-sm font-semibold" htmlFor="emojiPolicy">
          Emojis
          <select id="emojiPolicy" className="field mt-1" {...form.register("emojiPolicy")}>
            <option value="none">Não usar</option>
            <option value="rare">Raros</option>
          </select>
        </label>
        <label className="block text-sm font-semibold md:col-span-2" htmlFor="signOff">
          Assinatura
          <input id="signOff" className="field mt-1" {...form.register("signOff")} />
        </label>
        <label className="block text-sm font-semibold" htmlFor="preferredPhrases">
          Frases preferidas, uma por linha
          <textarea id="preferredPhrases" rows={4} className="field mt-1" {...form.register("preferredPhrases")} />
        </label>
        <label className="block text-sm font-semibold" htmlFor="avoidedPhrases">
          Expressões a evitar, uma por linha
          <textarea id="avoidedPhrases" rows={4} className="field mt-1" {...form.register("avoidedPhrases")} />
        </label>
        <label className="block text-sm font-semibold md:col-span-2" htmlFor="communicationRules">
          Regras de comunicação
          <textarea id="communicationRules" rows={4} className="field mt-1" {...form.register("communicationRules")} />
        </label>
      </fieldset>
      {canEdit ? (
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Salvando…" : onboarding ? "Salvar e abrir a primeira avaliação" : "Salvar clínica"}
        </Button>
      ) : (
        <p className="text-sm text-muted">Seu perfil pode consultar estes dados, mas não alterá-los.</p>
      )}
    </form>
  );
}
