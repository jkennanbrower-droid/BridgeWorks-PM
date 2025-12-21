const healthStats = [
  { id: "mh-1", label: "Emergency", value: "2", accent: "text-red-600" },
  { id: "mh-2", label: "Urgent", value: "5", accent: "text-amber-600" },
  { id: "mh-3", label: "Past Due", value: "4", accent: "text-slate-700" },
  { id: "mh-4", label: "Avg Days Open", value: "8", accent: "text-slate-700" },
];

const latestTickets = [
  {
    id: "mt-1",
    title: "Overflowing Toilet",
    unit: "Unit 8",
    status: "Emergency",
    age: "8 hours ago",
  },
  {
    id: "mt-2",
    title: "Broken AC Unit",
    unit: "Unit 22",
    status: "Urgent",
    age: "2 days ago",
  },
];

export function MaintenanceHealthWidget() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {healthStats.map((stat) => (
          <div
            key={stat.id}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2"
          >
            <p className="text-xs text-slate-500">{stat.label}</p>
            <p className={`text-lg font-semibold ${stat.accent}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-400">
          <span>Recent tickets</span>
          <button type="button" className="text-slate-500">
            View all
          </button>
        </div>
        {latestTickets.map((ticket) => (
          <div
            key={ticket.id}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
          >
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {ticket.title}
              </p>
              <p className="text-xs text-slate-400">{ticket.unit}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-600">
                {ticket.status}
              </p>
              <p className="text-[11px] text-slate-400">{ticket.age}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
