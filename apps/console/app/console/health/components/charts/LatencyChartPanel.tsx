import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format } from "date-fns";

type LatencyPoint = {
  timestamp: string;
  p50: number | null;
  p95: number | null;
  p99: number | null;
};

type LatencyChartPanelProps = {
  data: LatencyPoint[];
};

export function LatencyChartPanel({ data }: LatencyChartPanelProps) {
  if (!data.length) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
        Collecting latency metrics...
      </div>
    );
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="timestamp" hide />
          <YAxis hide domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              borderColor: "#e2e8f0",
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
            }}
            labelFormatter={(label) =>
              label ? format(new Date(label), "MMM d, h:mm a") : ""
            }
          />
          <Line type="monotone" dataKey="p50" stroke="#93c5fd" dot={false} />
          <Line type="monotone" dataKey="p95" stroke="#2563eb" dot={false} />
          <Line type="monotone" dataKey="p99" stroke="#1e3a8a" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
