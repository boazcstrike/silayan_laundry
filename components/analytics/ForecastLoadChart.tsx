"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { LoadForecast } from "@/lib/laundryLoadForecast";

const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--muted-foreground)",
];

const TOP_CATEGORIES = 5;
const OTHER_KEY = "other";

/** Turn an arbitrary category name into a valid CSS-variable / dataKey slug. */
function slugify(name: string): string {
  return (
    String(name)
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toLowerCase() || "cat"
  );
}

function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

type ChartRow = Record<string, string | number>;

/**
 * Forecasted laundry load: for each predicted laundry day, the modelled item
 * count per category (recency-weighted trend). Stacked bars — top categories
 * plus an "Other" bucket. Heights vary by day because each category carries
 * its own trend.
 */
export function ForecastLoadChart({ loadForecast }: { loadForecast?: LoadForecast }) {
  const points = useMemo(() => loadForecast?.points ?? [], [loadForecast]);
  const ranked = useMemo(() => loadForecast?.categories ?? [], [loadForecast]);

  const top = useMemo(
    () =>
      ranked
        .slice(0, TOP_CATEGORIES)
        .map((c) => ({ name: c.name, slug: slugify(c.name) })),
    [ranked],
  );
  const otherNames = useMemo(
    () => ranked.slice(TOP_CATEGORIES).map((c) => c.name),
    [ranked],
  );

  const chartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {};
    top.forEach((category, index) => {
      config[category.slug] = {
        label: category.name,
        color: PALETTE[index % PALETTE.length],
      };
    });
    if (otherNames.length) {
      config[OTHER_KEY] = { label: "Other", color: PALETTE[5] };
    }
    return config;
  }, [top, otherNames]);

  const data = useMemo(() => {
    return points.map((point) => {
      const row: ChartRow = { date: point.date };
      top.forEach((category) => {
        row[category.slug] = point.byCategory[category.name] ?? 0;
      });
      if (otherNames.length) {
        row[OTHER_KEY] =
          Math.round(
            otherNames.reduce((sum, name) => sum + (point.byCategory[name] ?? 0), 0) * 10,
          ) / 10;
      }
      return row;
    });
  }, [points, top, otherNames]);

  if (!data.length || !top.length) {
    return <p className="muted">No category history to forecast item load yet.</p>;
  }

  const keys = [...top.map((c) => c.slug), ...(otherNames.length ? [OTHER_KEY] : [])];

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[240px] w-full">
      <BarChart accessibilityLayer data={data} margin={{ left: 4, right: 8, top: 8, bottom: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={20}
          tickFormatter={shortDate}
        />
        <YAxis tickLine={false} axisLine={false} width={28} />
        <ChartTooltip
          content={<ChartTooltipContent labelFormatter={(value) => shortDate(String(value))} />}
        />
        <ChartLegend content={<ChartLegendContent />} />
        {keys.map((key, index) => (
          <Bar
            key={key}
            dataKey={key}
            stackId="load"
            fill={`var(--color-${key})`}
            radius={index === keys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
