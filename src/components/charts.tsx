"use client";

// Thin Recharts wrappers (client components). Data always comes from the server.
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export interface Series {
  key: string;
  label?: string;
  color: string;
}

const TOOLTIP_STYLE = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--popover-foreground)",
  fontSize: 12,
};
const legendText = (value: string) => <span style={{ color: "var(--muted-foreground)" }}>{value}</span>;

function ChartEmpty() {
  return <p className="py-10 text-center text-sm text-muted-foreground">No data to display yet.</p>;
}

export function BarChartView({
  data, series, stacked = false, height = 260, yMax,
}: {
  data: Record<string, string | number>[];
  series: Series[];
  stacked?: boolean;
  height?: number;
  yMax?: number;
}) {
  if (data.length === 0) return <ChartEmpty />;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} interval={0} />
          <YAxis allowDecimals={false} domain={[0, yMax ?? "auto"]} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.5 }} contentStyle={TOOLTIP_STYLE} itemStyle={{ color: "var(--popover-foreground)" }} labelStyle={{ color: "var(--popover-foreground)" }} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} formatter={legendText} />}
          {series.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label ?? s.key}
              fill={s.color}
              stackId={stacked ? "stack" : undefined}
              radius={stacked ? 0 : [4, 4, 0, 0]}
              maxBarSize={48}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutView({
  data, height = 240,
}: {
  data: { name: string; value: number; color: string }[];
  height?: number;
}) {
  if (data.length === 0 || data.every((d) => d.value === 0)) return <ChartEmpty />;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2} stroke="var(--card)">
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: "var(--popover-foreground)" }} labelStyle={{ color: "var(--popover-foreground)" }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}