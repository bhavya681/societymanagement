import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "./card";

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  align?: "left" | "right";
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  mobile,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  mobile: (row: T) => ReactNode;
}) {
  return (
    <>
      <div className="grid gap-3 md:hidden">
        {rows.map((row) => (
          <Card key={rowKey(row)}>
            <CardContent className="p-4">{mobile(row)}</CardContent>
          </Card>
        ))}
      </div>
      <Card className="hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {columns.map((column) => (
                  <th
                    key={column.header}
                    className={cn(
                      "px-4 py-2.5 text-left text-xs font-medium text-slate-500",
                      column.align === "right" && "text-right",
                      column.className,
                    )}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={rowKey(row)} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  {columns.map((column) => (
                    <td
                      key={column.header}
                      className={cn(
                        "px-4 py-3 text-slate-700",
                        column.align === "right" && "text-right tabular-nums",
                        column.className,
                      )}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">{children}</div>;
}

export function PaginationBar({
  page,
  totalPages,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-2 text-sm text-slate-500">
      <span>
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          className="h-8 cursor-pointer rounded-md border border-slate-200 bg-white px-3 text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={page <= 1}
          onClick={onPrev}
        >
          Previous
        </button>
        <button
          type="button"
          className="h-8 cursor-pointer rounded-md border border-slate-200 bg-white px-3 text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={page >= totalPages}
          onClick={onNext}
        >
          Next
        </button>
      </div>
    </div>
  );
}
