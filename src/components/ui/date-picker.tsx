"use client";

import * as React from "react";
import { format, isValid, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type DatePickerProps = {
  value?: string;
  defaultValue?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  keyboardEntry?: boolean;
  id?: string;
  name?: string;
  "aria-label"?: string;
};

function toDate(value?: string) {
  if (!value) return undefined;
  const date = parseISO(value);
  return isValid(date) ? date : undefined;
}

export function DatePicker({
  value,
  defaultValue,
  onChange,
  onValueChange,
  placeholder = "Seleccionar fecha",
  className,
  disabled,
  keyboardEntry = false,
  id,
  name,
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "");
  const [open, setOpen] = React.useState(false);
  const currentValue = controlled ? value : internalValue;
  const selected = toDate(currentValue);
  const [typedValue, setTypedValue] = React.useState(
    selected ? format(selected, "dd/MM/yyyy") : "",
  );

  React.useEffect(() => {
    const nextSelected = toDate(currentValue);
    setTypedValue(nextSelected ? format(nextSelected, "dd/MM/yyyy") : "");
  }, [currentValue]);

  const emit = (nextValue: string) => {
    if (!controlled) setInternalValue(nextValue);
    onValueChange?.(nextValue);
    onChange?.({
      target: { value: nextValue },
      currentTarget: { value: nextValue },
    } as unknown as React.ChangeEvent<HTMLInputElement>);
  };

  const update = (date?: Date) => {
    const nextValue = date ? format(date, "yyyy-MM-dd") : "";
    setOpen(false);
    emit(nextValue);
  };

  const typeDate = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    const display = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)]
      .filter(Boolean)
      .join("/");
    setTypedValue(display);
    if (digits.length !== 8) return;
    const day = Number(digits.slice(0, 2));
    const month = Number(digits.slice(2, 4));
    const year = Number(digits.slice(4, 8));
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day
    )
      emit(
        `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      );
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <span className="block">
        {name && <input name={name} type="hidden" value={currentValue} />}
        {keyboardEntry ? (
          <span
            className={cn(
              "flex h-9 w-full items-center rounded-md border border-stone-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-stone-300 dark:border-stone-700 dark:bg-stone-800",
              className,
            )}
          >
            <input
              aria-label={ariaLabel}
              className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
              disabled={disabled}
              id={id}
              inputMode="numeric"
              onBlur={() =>
                setTypedValue(selected ? format(selected, "dd/MM/yyyy") : "")
              }
              onChange={(event) => typeDate(event.target.value)}
              onFocus={(event) => event.currentTarget.select()}
              placeholder="DD/MM/AAAA"
              value={typedValue}
            />
            <PopoverTrigger
              disabled={disabled}
              render={
                <button
                  aria-label="Abrir calendario"
                  className="grid size-9 shrink-0 place-items-center rounded-r-md text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-700"
                  type="button"
                />
              }
            >
              <CalendarIcon className="size-4" />
            </PopoverTrigger>
          </span>
        ) : (
          <PopoverTrigger
            disabled={disabled}
            render={
              <button
                aria-label={ariaLabel}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-9 w-full cursor-pointer justify-start border-stone-200 bg-white px-3 text-left font-normal shadow-sm hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700",
                  !selected && "text-muted-foreground",
                  className,
                )}
                id={id}
                type="button"
              />
            }
          >
            <CalendarIcon className="text-muted-foreground" />
            {selected ? format(selected, "PPP", { locale: es }) : placeholder}
          </PopoverTrigger>
        )}
      </span>
      <PopoverContent
        align="start"
        className="z-[70] w-auto p-0"
        sideOffset={6}
      >
        <Calendar
          captionLayout="dropdown"
          locale={es}
          mode="single"
          onSelect={update}
          selected={selected}
        />
      </PopoverContent>
    </Popover>
  );
}
