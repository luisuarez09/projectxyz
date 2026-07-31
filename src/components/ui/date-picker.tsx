"use client"

import * as React from "react"
import { format, isValid, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"

type DatePickerProps = {
  value?: string
  defaultValue?: string
  onChange?: React.ChangeEventHandler<HTMLInputElement>
  onValueChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  id?: string
  name?: string
  "aria-label"?: string
}

function toDate(value?: string) {
  if (!value) return undefined
  const date = parseISO(value)
  return isValid(date) ? date : undefined
}

export function DatePicker({
  value,
  defaultValue,
  onChange,
  onValueChange,
  placeholder = "Seleccionar fecha",
  className,
  disabled,
  id,
  name,
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const controlled = value !== undefined
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "")
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLSpanElement>(null)
  const currentValue = controlled ? value : internalValue
  const selected = toDate(currentValue)

  React.useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", close)
    return () => document.removeEventListener("pointerdown", close)
  }, [open])

  const update = (date?: Date) => {
    const nextValue = date ? format(date, "yyyy-MM-dd") : ""
    if (!controlled) setInternalValue(nextValue)
    setOpen(false)
    onValueChange?.(nextValue)
    onChange?.({
      target: { value: nextValue },
      currentTarget: { value: nextValue },
    } as unknown as React.ChangeEvent<HTMLInputElement>)
  }

  return (
    <span className="relative block" ref={containerRef}>
      {name && <input name={name} type="hidden" value={currentValue} />}
      <div
        aria-label={ariaLabel}
        aria-disabled={disabled}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-9 w-full cursor-pointer justify-start border-stone-200 bg-white px-3 text-left font-normal shadow-sm hover:bg-stone-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 dark:border-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700",
          !selected && "text-muted-foreground",
          className
        )}
        id={id}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          if (!disabled) setOpen(true)
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            if (!disabled) setOpen(true)
          }
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
      >
        <CalendarIcon className="text-muted-foreground" />
        {selected ? format(selected, "PPP", { locale: es }) : placeholder}
      </div>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-auto rounded-lg bg-popover p-0 text-popover-foreground shadow-md ring-1 ring-foreground/10" data-slot="date-picker-content" role="dialog">
          <Calendar
            captionLayout="dropdown"
            locale={es}
            mode="single"
            onSelect={update}
            selected={selected}
          />
        </div>
      )}
    </span>
  )
}
