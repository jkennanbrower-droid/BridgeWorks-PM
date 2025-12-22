import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";

type SparklinePoint = {
  timestamp: string;
  value: number | null;
};

type SparklineProps = {
  data: SparklinePoint[];
  color: string;
  height?: number;
};

export function Sparkline({ data, color, height = 60 }: SparklineProps) {
  if (!data.length) {
    return (
      <div
        className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-[11px] text-slate-400"
        style={{ height }}
      >
        Collecting
      </div>
    );
  }

  const chartData = data.map((point) => ({
    timestamp: point.timestamp,
    value: point.value ?? null,
  }));
  const gradientId = `sparkline-${color.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              borderColor: "#e2e8f0",
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
            }}
            labelStyle={{ color: "#64748b", fontSize: 11 }}
            formatter={(value) => (value === null ? "--" : value)}
          />
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            fill={`url(#${gradientId})`}
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
