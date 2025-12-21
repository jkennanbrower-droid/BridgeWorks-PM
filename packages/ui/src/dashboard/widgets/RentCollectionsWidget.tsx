const delinquent = [
  { id: "d-1", name: "John Smith", unit: "Unit 12", amount: "$1,230", age: "14 days" },
  { id: "d-2", name: "Mary Johnson", unit: "Unit 7", amount: "$980", age: "9 days" },
  { id: "d-3", name: "Sarah & Mike", unit: "Unit 15", amount: "$640", age: "5 days" },
  { id: "d-4", name: "Lisa Martinez", unit: "Unit 5", amount: "$660", age: "8 days" },
];

export function RentCollectionsWidget() {
  const percent = 92;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-slate-500">Total collected</p>
          <p className="text-xl font-semibold text-slate-900">$46,100</p>
        </div>
        <p className="text-sm font-semibold text-slate-700">{percent}%</p>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-teal-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-400">
          <span>Top delinquencies</span>
          <button type="button" className="text-slate-500">
            View all
          </button>
        </div>
        {delinquent.map((item) => (
          <div key={item.id} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {item.name}
              </p>
              <p className="text-xs text-slate-400">{item.unit}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-700">
                {item.amount}
              </p>
              <p className="text-[11px] text-slate-400">{item.age}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
