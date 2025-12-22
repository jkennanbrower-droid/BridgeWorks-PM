import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format } from "date-fns";

type LineChartPoint = {
  timestamp: string;
  value: number | null;
};

type LineChartPanelProps = {
  data: LineChartPoint[];
  color: string;
  valueFormatter?: (value: number | null) => string;
};

export function LineChartPanel({
  data,
  color,
  valueFormatter,
}: LineChartPanelProps) {
  if (!data.length) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
        Collecting metrics...
      </div>
    );
  }

  const chartData = data.map((point) => ({
    timestamp: point.timestamp,
    value: point.value ?? null,
  }));

  const gradientId = `trend-${color.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
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
            formatter={(value) => {
              if (value === null || value === undefined) return "--";
              if (valueFormatter) return valueFormatter(Number(value));
              return Number(value).toFixed(2);
            }}
          />
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
