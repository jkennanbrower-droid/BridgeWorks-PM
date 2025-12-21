const urgentItems = [
  {
    id: "ua-1",
    title: "Overflowing Toilet",
    unit: "Unit 8",
    status: "Emergency",
    age: "8 hours ago",
  },
  {
    id: "ua-2",
    title: "Broken AC Unit",
    unit: "Unit 22",
    status: "Urgent",
    age: "2 days ago",
  },
  {
    id: "ua-3",
    title: "Lease Renewal Review",
    unit: "Unit 15",
    status: "Review",
    age: "Submitted 4 days ago",
  },
  {
    id: "ua-4",
    title: "Past Due Utility",
    unit: "Unit 5",
    status: "Urgent",
    age: "1 day ago",
  },
];

const statusStyles: Record<string, string> = {
  Emergency: "bg-red-100 text-red-700",
  Urgent: "bg-amber-100 text-amber-700",
  Review: "bg-slate-100 text-slate-600",
};

export function UrgentAttentionWidget() {
  return (
    <div className="space-y-3">
      {urgentItems.map((item) => (
        <div
          key={item.id}
          className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
        >
          <div>
            <p className="text-sm font-semibold text-slate-800">{item.title}</p>
            <p className="text-xs text-slate-500">{item.unit}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                statusStyles[item.status] ?? "bg-slate-100 text-slate-600"
              }`}
            >
              {item.status}
            </span>
            <span className="text-[11px] text-slate-400">{item.age}</span>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="text-xs font-semibold uppercase tracking-wide text-slate-400"
      >
        View all
      </button>
    </div>
  );
}
