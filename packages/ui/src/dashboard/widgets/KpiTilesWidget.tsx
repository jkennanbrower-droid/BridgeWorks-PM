const kpis = [
  {
    id: "kpi-1",
    label: "Occupancy Rate",
    value: "92%",
    helper: "23 of 25 units",
  },
  {
    id: "kpi-2",
    label: "Vacant Units",
    value: "2",
    helper: "Avg 13 days",
  },
  {
    id: "kpi-3",
    label: "Delinquent Rent",
    value: "$4,320",
    helper: "5 tenants",
  },
  {
    id: "kpi-4",
    label: "Open Work Orders",
    value: "12",
    helper: "4 past due",
  },
];

export function KpiTilesWidget() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {kpis.map((kpi) => (
        <div
          key={kpi.id}
          className="rounded-xl border border-slate-200 bg-white px-3 py-3"
        >
          <p className="text-xs text-slate-500">{kpi.label}</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {kpi.value}
          </p>
          <p className="text-[11px] text-slate-400">{kpi.helper}</p>
        </div>
      ))}
    </div>
  );
}
