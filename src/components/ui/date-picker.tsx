"use client"

import * as React from "react"
import { format, isValid, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

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
  const currentValue = controlled ? value : internalValue
  const selected = toDate(currentValue)

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
    <Popover onOpenChange={setOpen} open={open}>
      <span className="block">
        {name && <input name={name} type="hidden" value={currentValue} />}
        <PopoverTrigger
          disabled={disabled}
          render={<button
            aria-label={ariaLabel}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-9 w-full cursor-pointer justify-start border-stone-200 bg-white px-3 text-left font-normal shadow-sm hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700",
              !selected && "text-muted-foreground",
              className
            )}
            id={id}
            type="button"
          />}
        >
          <CalendarIcon className="text-muted-foreground" />
          {selected ? format(selected, "PPP", { locale: es }) : placeholder}
        </PopoverTrigger>
      </span>
      <PopoverContent align="start" className="z-[70] w-auto p-0" sideOffset={6}>
        <Calendar
          captionLayout="dropdown"
          locale={es}
          mode="single"
          onSelect={update}
          selected={selected}
        />
      </PopoverContent>
    </Popover>
  )
}
