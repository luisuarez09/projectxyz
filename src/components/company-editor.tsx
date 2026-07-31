"use client";;
import { AttachmentInput } from "@/components/ui/attachment-input";
import { AlertTriangle, BookOpenCheck, Building2, Check, FileText, Landmark, Pencil, Plus, Save, Settings2, Trash2, UsersRound } from "lucide-react";
import { useState, type ComponentType, type ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { SimpleSelect } from "@/components/ui/simple-select";

type Item = { id: number; title: string; detail: string };
type Mode = "rule" | "branch" | "board" | "account";
const field = "field mt-1.5";

export function CompanyEditor() {
  const [services, setServices] = useState(true);
  const [iva, setIva] = useState("16");
  const [rules, setRules] = useState<Item[]>([
    { id: 1, title: "IVA · Alícuota general", detail: "16 % · Fuente y vigencia por confirmar" },
    { id: 2, title: "Factor actividades económicas", detail: "0,80 % · Casa matriz · Municipio principal" },
  ]);
  const [branches, setBranches] = useState<Item[]>([
    { id: 1, title: "Casa matriz", detail: "Av. Principal, local 4 · Municipio principal" },
    { id: 2, title: "Sucursal Centro", detail: "Centro comercial, nivel 1 · Municipio de la sucursal" },
  ]);
  const [board, setBoard] = useState<Item[]>([{ id: 1, title: "Presidente · María Rojas", detail: "Vigente hasta 10 may 2028" }]);
  const [accounts, setAccounts] = useState<Item[]>([
    { id: 1, title: "1.1.01 · Caja y bancos", detail: "Activo · Cuenta referencial" },
    { id: 2, title: "1.1.02 · Cuentas por cobrar", detail: "Activo · Clientes" },
    { id: 3, title: "2.1.01 · Cuentas por pagar", detail: "Pasivo · Proveedores" },
    { id: 4, title: "4.1.01 · Ingresos por ventas", detail: "Ingreso · Operaciones comerciales" },
  ]);
  const [mode, setMode] = useState<Mode | null>(null);
  const [editing, setEditing] = useState<Item | null>(null);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [saved, setSaved] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleted, setDeleted] = useState(false);
  const [incesSeal, setIncesSeal] = useState<string | null>(null);
  const [incesSignature, setIncesSignature] = useState<string | null>(null);

  function openItem(nextMode: Mode, item?: Item) {
    setMode(nextMode); setEditing(item ?? null); setTitle(item?.title ?? ""); setDetail(item?.detail ?? "");
  }
  function saveItem() {
    if (!mode || !title.trim() || !detail.trim()) return;
    const apply = (items: Item[]) => editing ? items.map((item) => item.id === editing.id ? { ...item, title, detail } : item) : [...items, { id: Date.now(), title, detail }];
    if (mode === "rule") setRules(apply); else if (mode === "branch") setBranches(apply); else if (mode === "board") setBoard(apply); else setAccounts(apply);
    setMode(null);
  }

  return (
    <div className="mt-6 pb-16">
      <header className="flex flex-col gap-4 border-b border-stone-200 pb-6 dark:border-stone-800 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-sm text-stone-500">Empresa activa / Configuración</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Nueva Confitería del Sur, C.A.</h1><p className="mt-2 text-sm text-stone-600 dark:text-stone-300">Información general, cobertura, plan contable, datos tributarios, estructura legal y accesos.</p></div>
        <button className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#14352d] px-3 text-sm font-medium text-white" onClick={() => setSaved(true)}><Save size={16} />Guardar cambios</button>
      </header>
      <div className="mt-6 grid gap-6 xl:grid-cols-[13rem_minmax(0,1fr)]">
        <aside className="hidden h-fit rounded-xl border border-stone-200 bg-white p-3 shadow-sm dark:border-stone-800 dark:bg-stone-900 xl:block"><p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Secciones</p>{[["general", "General"], ["cobertura", "Cobertura"], ["plan-cuentas", "Plan de cuentas"], ["impuestos", "Impuestos"], ["sucursales", "Sucursales"], ["legal", "Legal"], ["inces", "INCES"], ["accesos", "Accesos"], ["eliminar", "Eliminar"]].map(([id, label]) => <a className="block rounded-lg px-2 py-2 text-sm text-stone-600 hover:bg-stone-100 hover:text-[#14352d] dark:text-stone-300 dark:hover:bg-stone-800" href={`#${id}`} key={id}>{label}</a>)}</aside>
        <main className="space-y-6">
          <Card id="general" icon={Building2} title="Información general" text="Datos principales, responsable de la firma y registros patronales."><div className="grid gap-4 md:grid-cols-2"><Field label="Razón social"><Input className={field} defaultValue="Nueva Confitería del Sur, C.A." /></Field><Field label="RIF"><Input className={field} defaultValue="J-309951441" /></Field><Field label="Domicilio fiscal"><Input className={field} defaultValue="Av. Principal, local 4" /></Field><Field label="Correo"><Input className={field} defaultValue="administracion@nuevaconfiteria.com" /></Field><Field label="Tipo de contribuyente"><SimpleSelect className={field}><option>Ordinario</option><option>Formal</option><option>Sujeto pasivo especial</option></SimpleSelect></Field><Field label="Contador responsable"><SimpleSelect className={field}><option>María Pérez</option><option>Luis Suárez</option></SimpleSelect></Field><Field label="Número patronal · IVSS"><Input className={field} defaultValue="123456789" inputMode="numeric" /></Field><Field label="N.º de afiliación de nómina · FAOV"><Input className={field} defaultValue="0321085357530000000" inputMode="numeric" /></Field></div><p className="mt-4 text-xs leading-5 text-stone-500">Estos números identifican a la empresa en los expedientes IVSS y FAOV; su acceso debe respetar los permisos de la empresa.</p></Card>
          <Card id="cobertura" icon={Settings2} title="Declaraciones y servicios" text="La empresa habilita lo que se controla; el detalle de servicios permanece separado."><div className="grid gap-2 sm:grid-cols-3">{["IVA", "Retenciones IVA", "Retenciones ISLR", "Actividades económicas", "IVSS", "INCES", "FAOV"].map((name) => <label className="flex items-center gap-2 rounded-lg border p-3 text-sm" key={name}><input defaultChecked={name === "IVA" || name === "Actividades económicas"} type="checkbox" />{name}</label>)}</div><label className="mt-5 flex items-center justify-between gap-4 rounded-lg border p-4"><span><b>Habilitar gestión de servicios</b><span className="mt-1 block text-sm text-stone-500">Los servicios específicos se administran en Configuración de empresa.</span></span><input checked={services} className="size-5 accent-[#14352d]" onChange={(event) => setServices(event.target.checked)} type="checkbox" /></label></Card>
          <Card id="plan-cuentas" icon={BookOpenCheck} title="Plan de cuentas" text="Estructura contable propia de la empresa y cuentas usadas por sus operaciones."><div className="mb-4 rounded-lg border border-sky-200 bg-sky-50/70 p-3 text-sm leading-5 text-sky-900 dark:border-sky-900 dark:bg-sky-950/25 dark:text-sky-100">Las cuentas visibles son demostrativas. Su persistencia y uso automático en compras, ventas y reportes se conectarán con el backend contable.</div><EditableList rows={accounts} onAdd={() => openItem("account")} onEdit={(item) => openItem("account", item)} onDelete={(id) => setAccounts((items) => items.filter((item) => item.id !== id))} /></Card>
          <Card id="impuestos" icon={Landmark} title="Impuestos, alícuotas y factores" text="Las reglas deben tener fuente y vigencia antes de usarse."><div className="mb-4 max-w-xs"><Field label="IVA · alícuota general"><div className="flex items-center gap-2"><Input className={field} onChange={(event) => { setIva(event.target.value); setRules((items) => items.map((item) => item.id === 1 ? { ...item, detail: `${event.target.value} % · Fuente y vigencia por confirmar` } : item)); }} value={iva} /><span className="mt-2">%</span></div></Field></div><EditableList rows={rules} onAdd={() => openItem("rule")} onEdit={(item) => openItem("rule", item)} onDelete={(id) => setRules((items) => items.filter((item) => item.id !== id))} /></Card>
          <Card id="sucursales" icon={Building2} title="Sucursales y jurisdicciones" text="Cada sede incluye domicilio y alcaldía aplicable."><EditableList rows={branches} onAdd={() => openItem("branch")} onEdit={(item) => openItem("branch", item)} onDelete={(id) => setBranches((items) => items.filter((item) => item.id !== id))} /></Card>
          <Card id="legal" icon={FileText} title="Información legal y junta directiva" text="Acta constitutiva, capital vigente y cargos con fechas de vigencia."><div className="grid gap-4 md:grid-cols-3"><Field label="Fecha de constitución"><DatePicker className={field} /></Field><Field label="Registro mercantil"><Input className={field} /></Field><Field label="Folio"><Input className={field} /></Field><Field label="Documento / tomo"><Input className={field} /></Field><Field label="Capital social vigente"><Input className={field} /></Field></div><p className="mt-5 font-semibold">Junta directiva</p><EditableList rows={board} onAdd={() => openItem("board")} onEdit={(item) => openItem("board", item)} onDelete={(id) => setBoard((items) => items.filter((item) => item.id !== id))} /></Card>
          <Card id="inces" icon={Landmark} title="INCES · representante y firma digital" text="Datos que alimentan la nómina consolidada y se conservan con acceso restringido."><div className="grid gap-4 md:grid-cols-2"><Field label="N.º de RNCP"><Input className={field} defaultValue="R-25-9-17-0087797" /></Field><Field label="Nombre del representante legal"><Input className={field} defaultValue="Suhail Al Hagari Abou" /></Field><Field label="Cédula del representante"><Input className={field} defaultValue="V-19.098.567" /></Field><Field label="Teléfono"><Input className={field} defaultValue="0414-6074156" /></Field><Field label="Correo"><Input className={field} defaultValue="administracion@nuevaconfiteria.com" type="email" /></Field></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-stone-300 p-3 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800"><FileText size={18} className="text-stone-500" /><span className="min-w-0 flex-1"><span className="block text-sm font-medium">Sello digital</span><span className="block truncate text-xs text-stone-500">{incesSeal ?? "PNG o imagen del sello"}</span></span><AttachmentInput
            accept="image/*"
            className="sr-only"
            onChange={(event) => setIncesSeal(event.target.files?.[0]?.name ?? null)} /></label><label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-stone-300 p-3 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800"><FileText size={18} className="text-stone-500" /><span className="min-w-0 flex-1"><span className="block text-sm font-medium">Firma digital</span><span className="block truncate text-xs text-stone-500">{incesSignature ?? "PNG o imagen de la firma"}</span></span><AttachmentInput
            accept="image/*"
            className="sr-only"
            onChange={(event) => setIncesSignature(event.target.files?.[0]?.name ?? null)} /></label></div><p className="mt-4 text-xs leading-5 text-stone-500">Los archivos deben almacenarse cifrados, con permisos por empresa y registro de auditoría cuando se conecte la persistencia.</p></Card>
          <Card id="accesos" icon={UsersRound} title="Portal del cliente" text="Usuarios autorizados para consultar y descargar documentos."><div className="rounded-lg border p-4"><b>María Rojas</b><p className="text-sm text-stone-500">Cliente administrador · Activo</p><div className="mt-3 flex gap-2"><button className="text-sm text-[#14352d]">Editar acceso</button><button className="text-sm text-rose-700">Revocar</button></div></div><button className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#14352d]"><Plus size={16} />Agregar usuario</button></Card>
          <Card id="eliminar" icon={Trash2} title="Eliminar empresa" text="Acción definitiva y no recuperable."><div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"><AlertTriangle className="mr-2 inline" size={16} />Para eliminar la empresa se debe escribir <b>ELIMINAR</b>. Se borrarán todos sus datos, documentos, declaraciones y evidencias.</div><button className="mt-4 rounded-lg border border-rose-300 px-3 py-2 text-sm font-medium text-rose-800" onClick={() => setDeleteOpen(true)}>Eliminar definitivamente</button></Card>
          {saved && <p className="flex items-center gap-2 text-sm font-medium text-emerald-700"><Check size={16} />Cambios guardados en esta vista.</p>}{deleted && <p className="text-sm font-medium text-rose-700">Empresa marcada como eliminada en esta vista.</p>}
        </main>
      </div>
      {deleteOpen && <Modal><h2 className="text-lg font-semibold text-rose-800">Eliminar Nueva Confitería del Sur, C.A.</h2><p className="mt-3 text-sm text-stone-600 dark:text-stone-300">Esta acción borrará definitivamente todos los datos y registros de la empresa, incluidos documentos, declaraciones y evidencias.</p><Field label="Escribe ELIMINAR para confirmar"><Input className={field} onChange={(event) => setDeleteText(event.target.value)} value={deleteText} /></Field><div className="mt-6 flex justify-end gap-2"><button onClick={() => { setDeleteOpen(false); setDeleteText(""); }}>Cancelar</button><button className="rounded-lg bg-rose-700 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40" disabled={deleteText !== "ELIMINAR"} onClick={() => { setDeleted(true); setDeleteOpen(false); setDeleteText(""); }}>Eliminar empresa</button></div></Modal>}
      {mode && <Modal><h2 className="text-lg font-semibold">{editing ? "Editar" : "Agregar"} {mode === "rule" ? "impuesto o factor" : mode === "branch" ? "sucursal" : mode === "board" ? "cargo directivo" : "cuenta contable"}</h2><Field label={mode === "branch" ? "Nombre de sucursal" : mode === "board" ? "Cargo y persona" : mode === "account" ? "Código y nombre de la cuenta" : "Regla"}><Input className={field} onChange={(event) => setTitle(event.target.value)} value={title} /></Field><Field label={mode === "branch" ? "Domicilio y alcaldía" : mode === "board" ? "Fechas de vigencia" : mode === "account" ? "Tipo y uso de la cuenta" : "Valor, fuente y vigencia"}><Input className={field} onChange={(event) => setDetail(event.target.value)} value={detail} /></Field><div className="mt-6 flex justify-end gap-2"><button onClick={() => setMode(null)}>Cancelar</button><button className="rounded-lg bg-[#14352d] px-3 py-2 text-sm text-white" onClick={saveItem}>Guardar</button></div></Modal>}
    </div>
  );
}

function Modal({ children }: { children: ReactNode }) { return <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/40 p-4"><section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-stone-900">{children}</section></div>; }
function Card({ id, icon: Icon, title, text, children }: { id: string; icon: ComponentType<{ size?: number }>; title: string; text: string; children: ReactNode }) { return <section className="scroll-mt-24 rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900" id={id}><div className="flex gap-3 border-b border-stone-100 p-5 dark:border-stone-800"><div className="grid size-9 place-items-center rounded-lg bg-[#e7f0e9] text-[#14352d]"><Icon size={18} /></div><div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-stone-500">{text}</p></div></div><div className="p-5">{children}</div></section>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="text-sm font-medium">{label}{children}</label>; }
function EditableList({ rows, onAdd, onEdit, onDelete }: { rows: Item[]; onAdd: () => void; onEdit: (item: Item) => void; onDelete: (id: number) => void }) { return <div className="mt-3 space-y-2">{rows.map((item) => <div className="flex items-center justify-between rounded-lg border p-3" key={item.id}><div><b>{item.title}</b><p className="text-sm text-stone-500">{item.detail}</p></div><div className="flex gap-2"><button aria-label={`Editar ${item.title}`} onClick={() => onEdit(item)}><Pencil size={16} /></button><button aria-label={`Eliminar ${item.title}`} className="text-rose-600" onClick={() => onDelete(item.id)}><Trash2 size={16} /></button></div></div>)}<button className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[#14352d]" onClick={onAdd}><Plus size={16} />Agregar</button></div>; }
