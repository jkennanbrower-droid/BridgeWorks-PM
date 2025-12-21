const pipeline = [
  {
    id: "lp-1",
    unit: "Unit 4",
    beds: "2 BR / 1 BA",
    stage: "Tours",
    score: 8,
  },
  {
    id: "lp-2",
    unit: "Unit 11",
    beds: "2 BR / 1 BA",
    stage: "Applications",
    score: 5,
  },
  {
    id: "lp-3",
    unit: "Unit 19",
    beds: "1 BR / 1 BA",
    stage: "Lease Sent",
    score: 3,
  },
];

export function LeasingPipelineWidget() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-400">
        <span>Active leads</span>
        <button type="button" className="text-slate-500">
          View all
        </button>
      </div>
      {pipeline.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3"
        >
          <div>
            <p className="text-sm font-semibold text-slate-800">{item.unit}</p>
            <p className="text-xs text-slate-400">{item.beds}</p>
            <p className="mt-1 text-[11px] uppercase text-slate-400">
              {item.stage}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Score</p>
            <p className="text-lg font-semibold text-slate-900">
              {item.score}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
