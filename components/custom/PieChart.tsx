"use client";

import { useMemo, useState } from "react";
import {
  Cell,
  Pie,
  PieChart as RCPieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { SDUIComponent } from "@/lib/types/sdui";
import {
  chartColorVar,
  formatValue,
  type ChartColorToken,
  type ValueFormat,
} from "@/lib/chart-format";

type Slice = {
  key: string;
  label: string;
  value: number;
  color: ChartColorToken;
};

const heightClass: Record<string, string> = {
  sm: "h-52",
  md: "h-72",
  lg: "h-96",
};

type TooltipPayloadEntry = {
  name?: string;
  value?: number;
  payload?: Slice;
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  valueFormat: ValueFormat;
  visibleTotal: number;
};

function ChartTooltip({
  active,
  payload,
  valueFormat,
  visibleTotal,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0];
  const slice = entry.payload;
  if (!slice) return null;
  const pct =
    visibleTotal > 0 ? ((slice.value / visibleTotal) * 100).toFixed(1) : "0.0";
  return (
    <div className="rounded-md border bg-white px-3 py-2 text-xs shadow-md">
      <div className="font-medium text-gray-900 mb-1">{slice.label}</div>
      <div className="text-gray-700">
        {formatValue(slice.value, valueFormat)}
      </div>
      <div className="text-gray-500">{pct}%</div>
    </div>
  );
}

export function PieChartComponent({ component }: { component: SDUIComponent }) {
  const title = component.props.title as string | undefined;
  const height = (component.props.height as string) ?? "md";
  const shape = (component.props.shape as string) ?? "donut";
  const valueFormat = (component.props.value_format as ValueFormat) ?? "raw";
  const rawSlices = (component.props.slices as Slice[] | undefined) ?? [];
  const showLegend = component.props.show_legend !== false;
  const emptyMessage = (component.props.empty_message as string) ?? "";

  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const allSlices = useMemo(
    () => rawSlices.filter((s) => typeof s.value === "number" && s.value > 0),
    [rawSlices],
  );

  const visibleSlices = useMemo(
    () => allSlices.filter((s) => !hidden.has(s.key)),
    [allSlices, hidden],
  );

  const visibleTotal = useMemo(
    () => visibleSlices.reduce((acc, s) => acc + s.value, 0),
    [visibleSlices],
  );

  const hClass = heightClass[height] ?? heightClass.md;
  const innerRadius = shape === "pie" ? 0 : "55%";

  function toggle(key: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (allSlices.length === 0) {
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

  return (
    <div>
      {title && <h3 className="text-sm font-medium mb-2">{title}</h3>}
      <div className={`${hClass} w-full`}>
        <ResponsiveContainer width="100%" height="100%">
          <RCPieChart>
            <Pie
              data={visibleSlices}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius="75%"
              paddingAngle={2}
              isAnimationActive={false}
            >
              {visibleSlices.map((s) => (
                <Cell key={s.key} fill={chartColorVar(s.color)} />
              ))}
            </Pie>
            <Tooltip
              content={
                <ChartTooltip
                  valueFormat={valueFormat}
                  visibleTotal={visibleTotal}
                />
              }
            />
          </RCPieChart>
        </ResponsiveContainer>
      </div>
      {showLegend && (
        <div className="mt-3 flex flex-wrap justify-center gap-3">
          {allSlices.map((s) => {
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
                  className="inline-block h-2 w-2 rounded-full"
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
