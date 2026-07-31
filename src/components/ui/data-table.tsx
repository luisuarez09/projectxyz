"use client"

import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SimpleSelect } from "@/components/ui/simple-select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchPlaceholder?: string
  emptyMessage?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = "Buscar...",
  emptyMessage = "No hay resultados.",
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    state: { globalFilter, sorting },
    initialState: { pagination: { pageSize: 25 } },
  })

  return (
    <div className="space-y-3">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input
          className="h-9 pl-9"
          onChange={(event) => table.setGlobalFilter(event.target.value)}
          placeholder={searchPlaceholder}
          value={globalFilter}
        />
      </div>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          )) : (
            <TableRow>
              <TableCell className="h-24 text-center text-muted-foreground" colSpan={columns.length}>
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{table.getFilteredRowModel().rows.length} registros</span>
        <div className="flex items-center gap-2">
          <span>Mostrar</span>
          <SimpleSelect
            aria-label="Filas por página"
            className="w-24"
            onValueChange={(nextValue) => table.setPageSize(nextValue === "all" ? data.length || 1 : Number(nextValue))}
            value={table.getState().pagination.pageSize >= data.length && data.length > 0 ? "all" : String(table.getState().pagination.pageSize)}
          >
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="all">Todos</option>
          </SimpleSelect>
          <Button aria-label="Página anterior" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()} size="icon-sm" variant="outline">
            <ChevronLeft />
          </Button>
          <span>Página {table.getState().pagination.pageIndex + 1} de {Math.max(table.getPageCount(), 1)}</span>
          <Button aria-label="Página siguiente" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()} size="icon-sm" variant="outline">
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  )
}
