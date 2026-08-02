"use client";

import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import { Button } from "@/components/ui/button";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export function ArchivePdfPreview({
  expanded,
  file,
}: {
  expanded: boolean;
  file: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [viewportWidth, setViewportWidth] = useState(360);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setPageCount(0);
    setPageNumber(1);
    setZoom(1);
  }, [file]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const updateWidth = () => setViewportWidth(viewport.clientWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  const pageWidth = Math.max(
    250,
    Math.min(expanded ? 820 : 640, viewportWidth - 24) * zoom,
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-center gap-1 border-b border-stone-200 bg-white px-2 py-2 dark:border-stone-800 dark:bg-stone-900">
        <Button
          aria-label="Página anterior"
          disabled={pageNumber <= 1}
          onClick={() => setPageNumber((current) => Math.max(1, current - 1))}
          size="icon-sm"
          variant="ghost"
        >
          <ChevronLeft size={17} />
        </Button>
        <span className="min-w-24 text-center text-xs font-medium text-stone-600 dark:text-stone-300">
          Página {pageNumber} de {pageCount || "…"}
        </span>
        <Button
          aria-label="Página siguiente"
          disabled={!pageCount || pageNumber >= pageCount}
          onClick={() =>
            setPageNumber((current) => Math.min(pageCount, current + 1))
          }
          size="icon-sm"
          variant="ghost"
        >
          <ChevronRight size={17} />
        </Button>
        <span className="mx-1 h-5 w-px bg-stone-200 dark:bg-stone-700" />
        <Button
          aria-label="Reducir vista"
          disabled={zoom <= 0.75}
          onClick={() => setZoom((current) => Math.max(0.75, current - 0.25))}
          size="icon-sm"
          variant="ghost"
        >
          <Minus size={15} />
        </Button>
        <span className="min-w-11 text-center text-xs text-stone-500">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          aria-label="Ampliar vista"
          disabled={zoom >= 1.75}
          onClick={() => setZoom((current) => Math.min(1.75, current + 0.25))}
          size="icon-sm"
          variant="ghost"
        >
          <Plus size={15} />
        </Button>
      </div>
      <div
        className="min-h-0 flex-1 overflow-auto bg-stone-200/70 p-3 dark:bg-stone-950"
        ref={viewportRef}
      >
        <Document
          error={
            <div className="grid h-full min-h-96 place-items-center bg-white p-8 text-center text-sm text-rose-700">
              No fue posible mostrar esta página del PDF.
            </div>
          }
          file={file}
          loading={
            <div className="grid h-full min-h-96 place-items-center bg-white p-8 text-center text-sm text-stone-500">
              Preparando páginas del PDF...
            </div>
          }
          onLoadSuccess={({ numPages }) => setPageCount(numPages)}
        >
          <Page
            className="mx-auto w-fit overflow-hidden bg-white shadow-sm"
            devicePixelRatio={Math.min(window.devicePixelRatio || 1, 2)}
            pageNumber={pageNumber}
            renderAnnotationLayer={false}
            renderTextLayer={false}
            width={pageWidth}
          />
        </Document>
      </div>
    </div>
  );
}
