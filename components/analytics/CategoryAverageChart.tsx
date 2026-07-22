"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { CategoryAverage } from "@/lib/services/AnalyticsDB";

const chartConfig: ChartConfig = {
  avgCount: { label: "Avg per batch", color: "var(--chart-3)" },
};

/**
 * Horizontal bar chart of the average quantity of each item per laundry batch.
 * Sorted descending with value labels (chart a11y: values always visible).
 */
export function CategoryAverageChart({ data = [] }: { data?: CategoryAverage[] }) {
  if (!data.length) {
    return <p className="muted">No category data yet.</p>;
  }

  const rows = data.slice(0, 8);

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
      <BarChart
        accessibilityLayer
        data={rows}
        layout="vertical"
        margin={{ left: 8, right: 32, top: 4, bottom: 4 }}
      >
        <CartesianGrid horizontal={false} />
        <XAxis type="number" dataKey="avgCount" tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          width={96}
          tickMargin={8}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Bar dataKey="avgCount" fill="var(--color-avgCount)" radius={[0, 6, 6, 0]}>
          <LabelList
            dataKey="avgCount"
            position="right"
            className="fill-foreground"
            fontSize={12}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
