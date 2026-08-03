"use client"

import * as React from "react"
import { FileUp, Paperclip } from "lucide-react"

import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment"
import { cn } from "@/lib/utils"

type AttachmentInputProps = Omit<React.ComponentProps<"input">, "type"> & {
  label?: string
  description?: string
  fileName?: string
  enableDrop?: boolean
}

export const AttachmentInput = React.forwardRef<HTMLInputElement, AttachmentInputProps>(
  function AttachmentInput(
    allProps,
    forwardedRef
  ) {
    const {
      accept,
      "aria-label": ariaLabel,
      className: _legacyClassName,
      description,
      disabled,
      enableDrop = true,
      fileName: controlledFileName,
      label = "Adjuntar archivo",
      onChange,
      ...inputProps
    } = allProps
    const inputRef = React.useRef<HTMLInputElement>(null)
    const [internalFileName, setInternalFileName] = React.useState("")
    const [dragging, setDragging] = React.useState(false)
    const fileName = "fileName" in allProps
      ? controlledFileName ?? ""
      : internalFileName

    React.useImperativeHandle(forwardedRef, () => inputRef.current as HTMLInputElement)

    const selectFile = (file?: File) => {
      if (!file || !inputRef.current) return
      const transfer = new DataTransfer()
      transfer.items.add(file)
      inputRef.current.files = transfer.files
      setInternalFileName(file.name)
      onChange?.({
        target: inputRef.current,
        currentTarget: inputRef.current,
      } as React.ChangeEvent<HTMLInputElement>)
    }

    return (
      <span className="block min-w-0">
        <input
          {...inputProps}
          accept={accept}
          className={cn("sr-only", _legacyClassName)}
          disabled={disabled}
          onChange={(event) => {
            setInternalFileName(event.target.files?.[0]?.name ?? "")
            onChange?.(event)
          }}
          ref={inputRef}
          type="file"
        />
        <Attachment
          className={cn(
            "w-full min-w-0",
            dragging && "border-[#14352d] bg-[#e7f0e9]/60 dark:bg-emerald-950/40"
          )}
          onDragEnter={(event) => {
            if (!enableDrop || disabled) return
            event.preventDefault()
            event.stopPropagation()
            setDragging(true)
          }}
          onDragLeave={(event) => {
            if (!enableDrop || disabled) return
            event.preventDefault()
            event.stopPropagation()
            setDragging(false)
          }}
          onDragOver={(event) => {
            if (!enableDrop || disabled) return
            event.preventDefault()
            event.stopPropagation()
            event.dataTransfer.dropEffect = "copy"
          }}
          onDrop={(event) => {
            if (!enableDrop || disabled) return
            event.preventDefault()
            event.stopPropagation()
            setDragging(false)
            selectFile(event.dataTransfer.files?.[0])
          }}
          onClick={() => {
            if (!disabled) inputRef.current?.click()
          }}
          onKeyDown={(event) => {
            if (disabled || (event.key !== "Enter" && event.key !== " ")) return
            event.preventDefault()
            inputRef.current?.click()
          }}
          aria-label={ariaLabel ?? `${fileName ? "Reemplazar" : "Seleccionar"} ${label.toLowerCase()}`}
          role="button"
          state={fileName ? "done" : "idle"}
          tabIndex={disabled ? -1 : 0}
        >
          <AttachmentMedia>
            {fileName ? <Paperclip /> : <FileUp />}
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{fileName || label}</AttachmentTitle>
            <AttachmentDescription>
              {fileName
                ? "Archivo preparado para adjuntar"
                : `${description ?? acceptedDescription(accept)}${enableDrop ? " · Arrastra o selecciona un archivo" : ""}`}
            </AttachmentDescription>
          </AttachmentContent>
        </Attachment>
      </span>
    )
  }
)

function acceptedDescription(accept?: string) {
  if (!accept) return "Selecciona un archivo"
  if (accept.includes("csv") || accept.includes("xls")) return "CSV o Excel"
  if (accept.includes("image") && accept.includes("pdf")) return "PDF, JPG o PNG"
  if (accept.includes("image")) return "PNG, JPG o SVG"
  return accept.replaceAll(".", "").toUpperCase()
}
