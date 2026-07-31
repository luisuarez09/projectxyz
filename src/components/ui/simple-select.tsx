"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type SimpleSelectProps = {
  children: React.ReactNode
  value?: string | number
  defaultValue?: string | number
  onChange?: React.ChangeEventHandler<HTMLSelectElement>
  onValueChange?: (value: string) => void
  className?: string
  disabled?: boolean
  name?: string
  id?: string
  "aria-label"?: string
}

type SelectOption = {
  label: React.ReactNode
  value: string
  disabled?: boolean
}

function getOptions(children: React.ReactNode): SelectOption[] {
  return React.Children.toArray(children).flatMap((child) => {
    if (!React.isValidElement<{ value?: string | number; disabled?: boolean; children?: React.ReactNode }>(child)) {
      return []
    }

    if (child.type === React.Fragment) return getOptions(child.props.children)

    return [{
      label: child.props.children,
      value: String(child.props.value ?? child.props.children ?? ""),
      disabled: child.props.disabled,
    }]
  })
}

export function SimpleSelect({
  children,
  value,
  defaultValue,
  onChange,
  onValueChange,
  className,
  disabled,
  name,
  id,
  "aria-label": ariaLabel,
}: SimpleSelectProps) {
  const options = getOptions(children)
  const initialValue = String(value ?? defaultValue ?? options[0]?.value ?? "")
  const [internalValue, setInternalValue] = React.useState(initialValue)
  const controlled = value !== undefined
  const currentValue = controlled ? String(value) : internalValue

  const update = (nextValue: string | null) => {
    const normalized = nextValue ?? ""
    if (!controlled) setInternalValue(normalized)
    onValueChange?.(normalized)
    onChange?.({
      target: { value: normalized },
      currentTarget: { value: normalized },
    } as unknown as React.ChangeEvent<HTMLSelectElement>)
  }

  return (
    <Select
      disabled={disabled}
      items={options.map((option) => ({ label: option.label, value: option.value }))}
      onValueChange={update}
      value={currentValue}
    >
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn("h-9 w-full border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-800", className)}
        id={id}
        name={name}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem disabled={option.disabled} key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
