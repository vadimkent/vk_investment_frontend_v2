export type ValueFormat =
  | "currency"
  | "currency_compact"
  | "percent"
  | "percent_signed"
  | "integer"
  | "decimal_2"
  | "raw";

export type AxisFormat = "date" | "month_year" | "integer" | "raw";

export type ChartColorToken =
  | "chart_1"
  | "chart_2"
  | "chart_3"
  | "chart_4"
  | "chart_5";

export function chartColorVar(token: ChartColorToken | string): string {
  const cycled = [
    "--chart-1",
    "--chart-2",
    "--chart-3",
    "--chart-4",
    "--chart-5",
  ];
  const idx = Number.parseInt(token.replace("chart_", ""), 10);
  const name =
    Number.isFinite(idx) && idx >= 1
      ? cycled[(idx - 1) % cycled.length]
      : cycled[0];
  return `var(${name})`;
}

function locale(): string | undefined {
  if (typeof document !== "undefined" && document.documentElement.lang) {
    return document.documentElement.lang;
  }
  return undefined;
}

export function formatValue(
  raw: unknown,
  format: ValueFormat,
  currency = "USD",
): string {
  if (raw == null || raw === "") return "";
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return String(raw);
  const loc = locale();
  switch (format) {
    case "currency":
      return new Intl.NumberFormat(loc, {
        style: "currency",
        currency,
      }).format(n);
    case "currency_compact":
      return new Intl.NumberFormat(loc, {
        style: "currency",
        currency,
        notation: "compact",
        maximumFractionDigits: 2,
      }).format(n);
    case "percent":
      return new Intl.NumberFormat(loc, {
        style: "percent",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n / 100);
    case "percent_signed":
      return `${n >= 0 ? "+" : ""}${new Intl.NumberFormat(loc, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n)}%`;
    case "integer":
      return new Intl.NumberFormat(loc, { maximumFractionDigits: 0 }).format(n);
    case "decimal_2":
      return new Intl.NumberFormat(loc, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n);
    case "raw":
    default:
      return String(n);
  }
}

export function formatAxis(raw: unknown, format: AxisFormat): string {
  if (raw == null || raw === "") return "";
  const loc = locale();
  switch (format) {
    case "date": {
      const d = new Date(String(raw));
      if (Number.isNaN(d.getTime())) return String(raw);
      return new Intl.DateTimeFormat(loc, {
        month: "short",
        day: "numeric",
      }).format(d);
    }
    case "month_year": {
      const d = new Date(String(raw));
      if (Number.isNaN(d.getTime())) return String(raw);
      return new Intl.DateTimeFormat(loc, {
        month: "short",
        year: "numeric",
      }).format(d);
    }
    case "integer": {
      const n = typeof raw === "number" ? raw : Number(raw);
      return Number.isFinite(n)
        ? new Intl.NumberFormat(loc, { maximumFractionDigits: 0 }).format(n)
        : String(raw);
    }
    case "raw":
    default:
      return String(raw);
  }
}
