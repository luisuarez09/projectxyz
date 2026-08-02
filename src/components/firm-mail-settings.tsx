"use client";

import { CheckCircle2, CircleAlert, KeyRound, LoaderCircle, Mail, Send, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ConnectionStatus = "NOT_TESTED" | "VERIFIED" | "FAILED";
type FormState = {
  enabled: boolean;
  provider: "MAILRELAY" | "CUSTOM_SMTP";
  senderDomain: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpRequireTls: boolean;
  smtpUser: string;
  smtpPassword: string;
  fromAddress: string;
  fromName: string;
  replyTo: string;
  connectionStatus: ConnectionStatus;
  hasPassword: boolean;
  lastVerifiedAt: string | null;
  lastConnectionError: string | null;
};

const emptyForm: FormState = {
  enabled: false,
  provider: "MAILRELAY",
  senderDomain: "",
  smtpHost: "",
  smtpPort: 587,
  smtpSecure: false,
  smtpRequireTls: true,
  smtpUser: "",
  smtpPassword: "",
  fromAddress: "",
  fromName: "Luis Suarez",
  replyTo: "lsuarez.asesor@gmail.com",
  connectionStatus: "NOT_TESTED",
  hasPassword: false,
  lastVerifiedAt: null,
  lastConnectionError: null,
};

function fromApi(settings: Record<string, unknown> | null): FormState {
  if (!settings) return emptyForm;
  return {
    enabled: Boolean(settings.enabled),
    provider: settings.provider === "CUSTOM_SMTP" ? "CUSTOM_SMTP" : "MAILRELAY",
    senderDomain: String(settings.senderDomain ?? ""),
    smtpHost: String(settings.smtpHost ?? ""),
    smtpPort: Number(settings.smtpPort ?? 587),
    smtpSecure: Boolean(settings.smtpSecure),
    smtpRequireTls: Boolean(settings.smtpRequireTls),
    smtpUser: String(settings.smtpUser ?? ""),
    smtpPassword: "",
    fromAddress: String(settings.fromAddress ?? ""),
    fromName: String(settings.fromName ?? "Luis Suarez"),
    replyTo: String(settings.replyTo ?? "lsuarez.asesor@gmail.com"),
    connectionStatus: settings.connectionStatus === "VERIFIED" ? "VERIFIED" : settings.connectionStatus === "FAILED" ? "FAILED" : "NOT_TESTED",
    hasPassword: Boolean(settings.hasPassword),
    lastVerifiedAt: settings.lastVerifiedAt ? String(settings.lastVerifiedAt) : null,
    lastConnectionError: settings.lastConnectionError ? String(settings.lastConnectionError) : null,
  };
}

export function FirmMailSettings() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"save" | "test" | null>(null);
  const [message, setMessage] = useState("");
  const [authRequired, setAuthRequired] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/firm/mail-settings", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) setAuthRequired(true);
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "No fue posible cargar la configuración.");
        if (active) setForm(fromApi(body.settings));
      })
      .catch((error: Error) => { if (active) setMessage(error.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const update = <K extends keyof FormState>(field: K, value: FormState[K], connectionField = true) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(connectionField ? { enabled: false, connectionStatus: "NOT_TESTED" as const, lastVerifiedAt: null, lastConnectionError: null } : {}),
    }));
    setMessage("");
  };

  const request = async (kind: "save" | "test") => {
    setBusy(kind);
    setMessage("");
    try {
      const response = await fetch(kind === "save" ? "/api/firm/mail-settings" : "/api/firm/mail-settings/test", {
        method: kind === "save" ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: kind === "save" ? JSON.stringify(form) : undefined,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No fue posible completar la operación.");
      setForm(fromApi(body.settings));
      setMessage(kind === "save" ? "Configuración guardada." : body.settings.connectionStatus === "VERIFIED" ? "Conexión verificada. Ya puedes activar las notificaciones y guardar." : body.settings.lastConnectionError);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible completar la operación.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div className="grid min-h-80 place-items-center"><LoaderCircle className="animate-spin text-stone-400" /></div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-10">
      <div className="flex flex-col gap-4 border-b border-stone-200 pb-6 dark:border-stone-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-stone-500">Configuración de la firma</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Correo y notificaciones</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-300">Prepara Mailrelay o cualquier servidor SMTP. Los envíos permanecen apagados hasta verificar la conexión.</p>
        </div>
        <StatusBadge enabled={form.enabled} status={form.connectionStatus} />
      </div>

      {authRequired && <div className="mt-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"><CircleAlert className="mt-0.5 shrink-0" size={18} /><p>Debes completar el acceso inicial como administrador para guardar esta configuración. <Link className="font-semibold underline" href="/login">Ir al acceso</Link>.</p></div>}

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-5">
          <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#edf4ef] text-[#14352d] dark:bg-emerald-950 dark:text-emerald-200"><Mail size={18} /></span><div><h2 className="font-semibold">Proveedor y dominio</h2><p className="mt-1 text-sm text-stone-500">Puedes guardar el borrador ahora y completar el dominio cuando lo compres.</p></div></div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Proveedor"><select className="field mt-1.5" onChange={(event) => update("provider", event.target.value as FormState["provider"])} value={form.provider}><option value="MAILRELAY">Mailrelay</option><option value="CUSTOM_SMTP">SMTP personalizado</option></select></Field>
              <Field label="Dominio remitente"><Input className="field mt-1.5" onChange={(event) => update("senderDomain", event.target.value)} placeholder="tudominio.com" value={form.senderDomain} /></Field>
            </div>
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <h2 className="font-semibold">Conexión SMTP</h2><p className="mt-1 text-sm text-stone-500">Copia estos valores desde el panel del proveedor. La contraseña guardada no se vuelve a mostrar.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Servidor SMTP"><Input className="field mt-1.5" onChange={(event) => update("smtpHost", event.target.value)} placeholder="smtp.tuproveedor.com" value={form.smtpHost} /></Field>
              <Field label="Puerto"><Input className="field mt-1.5" min={1} max={65535} onChange={(event) => update("smtpPort", Number(event.target.value))} type="number" value={form.smtpPort} /></Field>
              <Field label="Usuario SMTP"><Input autoComplete="username" className="field mt-1.5" onChange={(event) => update("smtpUser", event.target.value)} value={form.smtpUser} /></Field>
              <Field label="Contraseña SMTP"><Input autoComplete="new-password" className="field mt-1.5" onChange={(event) => update("smtpPassword", event.target.value)} placeholder={form.hasPassword ? "Contraseña guardada; deja en blanco para conservarla" : "Contraseña SMTP"} type="password" value={form.smtpPassword} /></Field>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <Check label="Conexión TLS directa (normalmente puerto 465)" checked={form.smtpSecure} onChange={(value) => update("smtpSecure", value)} />
              <Check label="Exigir STARTTLS (recomendado en puerto 587)" checked={form.smtpRequireTls} onChange={(value) => update("smtpRequireTls", value)} />
            </div>
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <h2 className="font-semibold">Identidad del remitente</h2><p className="mt-1 text-sm text-stone-500">El correo remitente deberá pertenecer al dominio verificado. El Gmail personal puede permanecer como dirección de respuesta.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Correo remitente"><Input className="field mt-1.5" onChange={(event) => update("fromAddress", event.target.value)} placeholder="notificaciones@tudominio.com" type="email" value={form.fromAddress} /></Field>
              <Field label="Nombre visible"><Input className="field mt-1.5" onChange={(event) => update("fromName", event.target.value)} value={form.fromName} /></Field>
              <Field label="Responder a"><Input className="field mt-1.5" onChange={(event) => update("replyTo", event.target.value)} type="email" value={form.replyTo} /></Field>
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="flex gap-3"><ShieldCheck className="shrink-0 text-[#14352d] dark:text-emerald-300" size={20} /><div><h2 className="font-semibold">Activación segura</h2><p className="mt-1 text-sm leading-6 text-stone-500">Guarda, prueba la conexión y luego activa. Cambiar cualquier dato vuelve a apagar los envíos.</p></div></div>
            <label className={`mt-5 flex items-start gap-3 rounded-xl border p-4 ${form.connectionStatus === "VERIFIED" ? "cursor-pointer border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40" : "cursor-not-allowed border-stone-200 bg-stone-50 opacity-70 dark:border-stone-700 dark:bg-stone-800"}`}>
              <input checked={form.enabled} className="mt-1 size-4 accent-[#14352d]" disabled={form.connectionStatus !== "VERIFIED"} onChange={(event) => update("enabled", event.target.checked, false)} type="checkbox" />
              <span><span className="block text-sm font-semibold">Activar notificaciones</span><span className="mt-1 block text-xs leading-5 text-stone-500">Solo disponible después de una prueba exitosa.</span></span>
            </label>
            <div className="mt-4 grid gap-2">
              <Button className="h-9 bg-[#14352d] text-white hover:bg-[#0e2821]" disabled={Boolean(busy) || authRequired} onClick={() => request("save")}><KeyRound /> {busy === "save" ? "Guardando…" : "Guardar configuración"}</Button>
              <Button className="h-9" disabled={Boolean(busy) || authRequired} onClick={() => request("test")} variant="outline"><Send /> {busy === "test" ? "Verificando…" : "Probar conexión"}</Button>
            </div>
            {message && <p aria-live="polite" className="mt-4 rounded-lg bg-stone-100 px-3 py-2 text-xs leading-5 text-stone-700 dark:bg-stone-800 dark:text-stone-200">{message}</p>}
          </section>

          <section className="rounded-xl border border-sky-200 bg-sky-50 p-5 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100">
            <h2 className="font-semibold">Pendiente para Mailrelay</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-4 leading-6"><li>Comprar el dominio.</li><li>Crear la cuenta corporativa.</li><li>Configurar SPF, DKIM y DMARC.</li><li>Copiar las credenciales SMTP aquí.</li></ol>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) { return <label className="field-label">{label}{children}</label>; }
function Check({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) { return <label className="flex items-start gap-2"><input checked={checked} className="mt-1 size-4 accent-[#14352d]" onChange={(event) => onChange(event.target.checked)} type="checkbox" /><span>{label}</span></label>; }
function StatusBadge({ enabled, status }: { enabled: boolean; status: ConnectionStatus }) {
  const verified = status === "VERIFIED";
  return <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${enabled ? "border-emerald-200 bg-emerald-50 text-emerald-800" : verified ? "border-sky-200 bg-sky-50 text-sky-800" : status === "FAILED" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-stone-200 bg-white text-stone-600 dark:border-stone-700 dark:bg-stone-900"}`}>{verified ? <CheckCircle2 size={14} /> : <CircleAlert size={14} />}{enabled ? "Notificaciones activas" : verified ? "Verificado, sin activar" : status === "FAILED" ? "Prueba fallida" : "Desactivado"}</span>;
}
