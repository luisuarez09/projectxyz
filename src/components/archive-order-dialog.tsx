"use client";

import { ArrowDown, ArrowUp, Check, LoaderCircle } from "lucide-react";
import type { ReactElement } from "react";
import { useState } from "react";

import { ReorderList } from "@/components/shadix-ui/components/reorder-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FirmOffering, OfferingKind } from "@/modules/firm/domain/catalog";

export function ArchiveOrderDialog({
  items,
  kind,
  onClose,
  onSaved,
}: {
  items: FirmOffering[];
  kind: OfferingKind;
  onClose: () => void;
  onSaved: (items: FirmOffering[]) => void;
}) {
  const [ordered, setOrdered] = useState(() =>
    [...items].sort(
      (left, right) =>
        left.archiveOrder - right.archiveOrder ||
        left.name.localeCompare(right.name, "es"),
    ),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function applyElementOrder(elements: ReactElement[]) {
    const ids = elements.map(
      (element) =>
        (element.props as { "data-offering-id": string })["data-offering-id"],
    );
    setOrdered((current) =>
      ids
        .map((id) => current.find((item) => item.id === id))
        .filter((item): item is FirmOffering => Boolean(item)),
    );
  }

  function move(index: number, offset: -1 | 1) {
    const destination = index + offset;
    if (destination < 0 || destination >= ordered.length) return;
    setOrdered((current) => {
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/firm/offerings/order", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          orderedIds: ordered.map(({ id }) => id),
        }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "No fue posible guardar el orden.");
      onSaved(body.offerings as FirmOffering[]);
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible guardar el orden.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open>
      <DialogContent className="max-w-2xl gap-0 p-0">
        <DialogHeader className="border-b border-stone-100 px-5 py-4 pr-14 dark:border-stone-800">
          <DialogTitle>
            Organizar {kind === "TAX" ? "impuestos" : "servicios"} en el archivo
          </DialogTitle>
          <DialogDescription>
            Arrastra cada elemento por el control lateral. Este será el orden de
            los separadores, el índice y las páginas al imprimir el lote.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {error && (
            <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              {error}
            </p>
          )}
          <ReorderList
            className="gap-2"
            itemClassName="rounded-xl"
            onReorderFinish={applyElementOrder}
            withDragHandle
          >
            {ordered.map((item, index) => (
              <div
                className="flex min-h-16 items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2.5 pr-14 dark:border-stone-700 dark:bg-stone-900"
                data-offering-id={item.id}
                key={item.id}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-stone-100 text-xs font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="truncate text-xs text-stone-500">
                    {item.organism}
                  </p>
                </div>
                {!item.active && <Badge variant="outline">Deshabilitado</Badge>}
                <div className="flex shrink-0 gap-1">
                  <Button
                    aria-label={`Subir ${item.name}`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <ArrowUp size={15} />
                  </Button>
                  <Button
                    aria-label={`Bajar ${item.name}`}
                    disabled={index === ordered.length - 1}
                    onClick={() => move(index, 1)}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <ArrowDown size={15} />
                  </Button>
                </div>
              </div>
            ))}
          </ReorderList>
        </div>
        <DialogFooter className="border-t border-stone-100 bg-white px-5 py-4 dark:border-stone-800 dark:bg-stone-900">
          <Button
            disabled={saving}
            onClick={onClose}
            type="button"
            variant="ghost"
          >
            Cancelar
          </Button>
          <Button
            className="bg-[#14352d] text-white hover:bg-[#0e2821]"
            disabled={saving}
            onClick={() => void save()}
            type="button"
          >
            {saving ? (
              <LoaderCircle className="animate-spin" size={16} />
            ) : (
              <Check size={16} />
            )}
            {saving ? "Guardando…" : "Guardar orden"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
