"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart as RCLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SDUIComponent } from "@/lib/types/sdui";
import {
  chartColorVar,
  formatAxis,
  formatValue,
  type AxisFormat,
  type ChartColorToken,
  type ValueFormat,
} from "@/lib/chart-format";

type Series = {
  key: string;
  label: string;
  color: ChartColorToken;
  value_format: ValueFormat;
};

type Row = Record<string, number | string | null>;

const heightClass: Record<string, string> = {
  sm: "h-52",
  md: "h-72",
  lg: "h-96",
};

type TooltipPayloadEntry = {
  dataKey?: string | number;
  value?: number | string;
  color?: string;
};

type ChartTooltipProps = {
  active?: boolean;
  label?: unknown;
  payload?: TooltipPayloadEntry[];
  series: Series[];
  xFormat: AxisFormat;
};

function ChartTooltip({
  active,
  label,
  payload,
  series,
  xFormat,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border bg-white px-3 py-2 text-xs shadow-md">
      <div className="font-medium text-gray-900 mb-1">
        {formatAxis(label, xFormat)}
      </div>
      {payload.map((entry) => {
        const s = series.find((sr) => sr.key === entry.dataKey);
        if (!s) return null;
        return (
          <div key={s.key} className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: entry.color }}
            />
            <span className="text-gray-600">{s.label}:</span>
            <span className="text-gray-900">
              {formatValue(entry.value, s.value_format)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function LineChartComponent({
  component,
}: {
  component: SDUIComponent;
}) {
  const title = component.props.title as string | undefined;
  const height = (component.props.height as string) ?? "md";
  const series = (component.props.series as Series[] | undefined) ?? [];
  const xAxis = component.props.x_axis as
    | { key: string; format: AxisFormat }
    | undefined;
  const yAxis = component.props.y_axis as { format?: ValueFormat } | undefined;
  const data = (component.props.data as Row[] | undefined) ?? [];
  const emptyMessage = (component.props.empty_message as string) ?? "";
  const showLegend = component.props.show_legend === true;

  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const hClass = heightClass[height] ?? heightClass.md;
  const xKey = xAxis?.key ?? "";
  const xFormat: AxisFormat = xAxis?.format ?? "raw";
  const yFormat: ValueFormat =
    yAxis?.format ?? series[0]?.value_format ?? "raw";

  function toggle(key: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (data.length < 2) {
    return (
      <div>
        {title && <h3 className="text-sm font-medium mb-2">{title}</h3>}
        <div
          className={`${hClass} w-full flex items-center justify-center text-sm text-gray-500`}
        >
          {emptyMessage}
        </div>
      </div>
    );
  }

  const tooltipSeries = series.filter((s) => !hidden.has(s.key));

  return (
    <div>
      {title && <h3 className="text-sm font-medium mb-2">{title}</h3>}
      <div className={`${hClass} w-full`}>
        <ResponsiveContainer width="100%" height="100%">
          <RCLineChart
            data={data}
            margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey={xKey}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              tickFormatter={(v: unknown) => formatAxis(v, xFormat)}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              width={60}
              tickFormatter={(v: unknown) => formatValue(v, yFormat)}
            />
            <Tooltip
              content={
                <ChartTooltip series={tooltipSeries} xFormat={xFormat} />
              }
            />
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={chartColorVar(s.color)}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                hide={hidden.has(s.key)}
              />
            ))}
          </RCLineChart>
        </ResponsiveContainer>
      </div>
      {showLegend && (
        <div className="mt-3 flex flex-wrap justify-center gap-3">
          {series.map((s) => {
            const isHidden = hidden.has(s.key);
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => toggle(s.key)}
                className={`flex items-center gap-1.5 text-xs transition-opacity ${
                  isHidden ? "opacity-35" : "opacity-100"
                }`}
              >
                <span
                  className="inline-block h-2 w-0.5 rounded-sm"
                  style={{ background: chartColorVar(s.color) }}
                />
                {s.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
