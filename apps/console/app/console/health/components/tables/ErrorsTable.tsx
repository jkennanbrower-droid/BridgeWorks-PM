import { Fragment, useMemo, useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";
import type { OpsErrorItem } from "../../_data/opsTypes";

type ErrorsTableProps = {
  items: OpsErrorItem[];
};

export function ErrorsTable({ items }: ErrorsTableProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const columns = useMemo<ColumnDef<OpsErrorItem>[]>(
    () => [
      {
        header: "Time",
        accessorKey: "timestamp",
        cell: (info) =>
          formatDistanceToNow(new Date(info.getValue<string>()), {
            addSuffix: true,
          }),
      },
      {
        header: "Message",
        accessorKey: "message",
        cell: (info) => (
          <span className="font-medium text-slate-800">
            {info.getValue<string>()}
          </span>
        ),
      },
      {
        header: "Route",
        accessorKey: "route",
      },
      {
        header: "Status",
        accessorKey: "status",
      },
      {
        header: "Count",
        accessorKey: "count",
      },
      {
        header: "Trace",
        accessorKey: "traceId",
        cell: (info) => info.getValue<string>() ?? "--",
      },
    ],
    [],
  );

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        No errors for this range yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="px-4 py-3">
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <Fragment key={row.id}>
              <tr
                className="border-t border-slate-100 hover:bg-slate-50"
                onClick={() =>
                  setActiveId(activeId === row.original.id ? null : row.original.id)
                }
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
              {activeId === row.original.id ? (
                <tr className="border-b border-slate-100">
                  <td colSpan={6} className="px-4 pb-4 pt-2 text-xs text-slate-500">
                    Stack trace placeholder (collecting error details).
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
