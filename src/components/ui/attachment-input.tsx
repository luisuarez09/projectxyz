"use client"

import * as React from "react"
import { FileUp, Paperclip } from "lucide-react"

import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment"

type AttachmentInputProps = Omit<React.ComponentProps<"input">, "type"> & {
  label?: string
  description?: string
  fileName?: string
}

export const AttachmentInput = React.forwardRef<HTMLInputElement, AttachmentInputProps>(
  function AttachmentInput(
    {
      accept,
      "aria-label": ariaLabel,
      className: _legacyClassName,
      description,
      disabled,
      fileName: controlledFileName,
      label = "Adjuntar archivo",
      onChange,
      ...props
    },
    forwardedRef
  ) {
    const inputRef = React.useRef<HTMLInputElement>(null)
    const [internalFileName, setInternalFileName] = React.useState("")
    const fileName = controlledFileName ?? internalFileName

    React.useImperativeHandle(forwardedRef, () => inputRef.current as HTMLInputElement)

    return (
      <span className="block min-w-0">
        <input
          {...props}
          accept={accept}
          className="sr-only"
          disabled={disabled}
          onChange={(event) => {
            setInternalFileName(event.target.files?.[0]?.name ?? "")
            onChange?.(event)
          }}
          ref={inputRef}
          type="file"
        />
        <Attachment className="w-full min-w-0" state={fileName ? "done" : "idle"}>
          <AttachmentMedia>
            {fileName ? <Paperclip /> : <FileUp />}
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{fileName || label}</AttachmentTitle>
            <AttachmentDescription>
              {fileName ? "Archivo preparado para adjuntar" : description ?? acceptedDescription(accept)}
            </AttachmentDescription>
          </AttachmentContent>
          <AttachmentTrigger
            aria-label={ariaLabel ?? `${fileName ? "Reemplazar" : "Seleccionar"} ${label.toLowerCase()}`}
            disabled={disabled}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              inputRef.current?.click()
            }}
          />
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
