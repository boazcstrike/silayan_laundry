"use client";

import { useMemo } from "react";
import { CalendarClock, Info } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { IntervalPoint } from "@/lib/laundryForecast";
import { ForecastLoadChart } from "@/components/analytics/ForecastLoadChart";
import type { ForecastPayload } from "@/components/analytics/types";

const chartConfig: ChartConfig = {
  predicted: { label: "Predicted day", color: "var(--chart-3)" },
  band: { label: "Confidence window", color: "var(--chart-5)" },
};

const cadenceConfig: ChartConfig = {
  gapDays: { label: "Days between", color: "var(--chart-3)" },
};

type DateFormatOptions = Intl.DateTimeFormatOptions;

function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

function formatDate(
  iso: string | null,
  opts: DateFormatOptions = { month: "short", day: "numeric", year: "numeric" },
): string {
  if (!iso) return "—";
  return toDate(iso).toLocaleDateString(undefined, opts);
}

function formatMonth(yyyymm: string): string {
  return toDate(`${yyyymm}-01`).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function countdownLabel(daysUntilNext: number | null): string | null {
  if (daysUntilNext == null) return null;
  if (daysUntilNext > 1) return `in ${daysUntilNext} days`;
  if (daysUntilNext === 1) return "tomorrow";
  if (daysUntilNext === 0) return "today";
  const abs = Math.abs(daysUntilNext);
  return `overdue by ${abs} ${abs === 1 ? "day" : "days"}`;
}

interface ProjectionChartPoint {
  date: string;
  predicted: number;
  band: [number, number];
  spreadDays: number;
  low: string;
  high: string;
  daysFromNow: number;
}

/** Tooltip for a projected laundry day: exact date + confidence window. */
function ProjectionTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: ProjectionChartPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div className="rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium text-foreground">{formatDate(point.date)}</div>
      <div className="text-muted-foreground">{point.daysFromNow} days ahead</div>
      {point.spreadDays > 0 ? (
        <div className="text-muted-foreground">
          ± {point.spreadDays}d ({formatDate(point.low, { month: "short", day: "numeric" })} –{" "}
          {formatDate(point.high, { month: "short", day: "numeric" })})
        </div>
      ) : null}
    </div>
  );
}

/** Drawer body: the prediction + projection formula with live values plugged in. */
function ForecastFormula({ forecast }: { forecast: ForecastPayload }) {
  const { decay, gaps, averageGapDays, stdDevDays, confidence, lastLaundryDate } = forecast;
  const m = gaps.length;

  return (
    <div className="flex flex-col gap-4 px-4 pb-6 text-sm">
      <section className="flex flex-col gap-2">
        <h3 className="font-medium text-foreground">Model: EWMA of laundry gaps</h3>
        <p className="text-muted-foreground">
          We take the gaps (in days) between your past laundry days and compute a weighted
          average — recent gaps count more than old ones. Future days are projected by rolling
          that cycle forward, with the window widening the further out we look.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h4 className="font-medium text-foreground">Formula</h4>
        <pre className="overflow-x-auto rounded-lg border border-border/60 bg-muted/40 p-3 font-mono text-xs leading-relaxed text-foreground">
{`predictedCycle = round( Σ wᵢ·gᵢ / Σ wᵢ )

  gᵢ  = gap i (days between laundry i and i+1)
  wᵢ  = ${decay}^(m−1−i)      decay weight, newest gap = weight 1
  m   = ${m}                  number of gaps

dayₖ    = lastLaundryDay + k · predictedCycle      (k = 1,2,3 …)
windowₖ = dayₖ ± stdDev · √k                        (grows with horizon)`}
        </pre>
      </section>

      <section className="flex flex-col gap-2">
        <h4 className="font-medium text-foreground">Your numbers</h4>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Decay factor</dt>
          <dd className="font-mono text-foreground">{decay}</dd>
          <dt className="text-muted-foreground">Gaps (days)</dt>
          <dd className="font-mono text-foreground">[{gaps.join(", ")}]</dd>
          <dt className="text-muted-foreground">Predicted cycle</dt>
          <dd className="font-mono text-foreground">{averageGapDays} days</dd>
          <dt className="text-muted-foreground">Std deviation</dt>
          <dd className="font-mono text-foreground">±{stdDevDays} days</dd>
          <dt className="text-muted-foreground">Confidence</dt>
          <dd className="font-mono text-foreground">{Math.round(confidence * 100)}%</dd>
          <dt className="text-muted-foreground">Last laundry</dt>
          <dd className="font-mono text-foreground">{formatDate(lastLaundryDate)}</dd>
        </dl>
        <p className="text-xs text-muted-foreground">
          Confidence = 1 − (stdDev ÷ predictedCycle), clamped 0–100%. The √k term means the
          window roughly doubles every four cycles out.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h4 className="font-medium text-foreground">Load by category</h4>
        <p className="text-muted-foreground">
          Each category gets its own recency-weighted linear trend (zero-filled in batches where
          it was absent), rolled forward with a damped term so it levels off instead of running
          away, then clipped to a sane range.
        </p>
        <pre className="overflow-x-auto rounded-lg border border-border/60 bg-muted/40 p-3 font-mono text-xs leading-relaxed text-foreground">
{`ŷ_c(t) = clip( L_c + b_c · S·(1 − e^(−Δ/S)),  0,  1.5·maxᵢ yᵢ )

  (a_c, b_c) = weighted least-squares fit of count vs. day
  wᵢ         = 0.7^(N−1−i)     recency weights, newest = 1
  L_c        = a_c + b_c·t_last   level at the last real wash
  Δ          = t − t_last         days into the future
  S          = 60                 saturation scale (trend plateaus)`}
        </pre>
      </section>

      <SheetClose render={<Button variant="secondary" className="interactive focus-ring" />}>
        Got it
      </SheetClose>
    </div>
  );
}

/**
 * Laundry forecast card: predicted next day, a 6-month projection chart with a
 * widening confidence band and a point per predicted laundry day, the next
 * upcoming days, a monthly outlook, and a formula drawer.
 */
export function LaundryForecastPanel({
  forecast,
  intervalHistory = [],
}: {
  forecast: ForecastPayload | null;
  intervalHistory?: IntervalPoint[];
}) {
  const projection = useMemo(() => forecast?.projection ?? [], [forecast]);

  const chartData = useMemo<ProjectionChartPoint[]>(
    () =>
      projection.map((point) => ({
        date: point.date,
        predicted: point.daysFromNow,
        band: [point.lowDaysFromNow, point.highDaysFromNow],
        spreadDays: point.spreadDays,
        low: point.low,
        high: point.high,
        daysFromNow: point.daysFromNow,
      })),
    [projection],
  );

  const monthlyOutlook = useMemo(() => {
    const byMonth = new Map<string, { month: string; count: number; firstDate: string }>();
    for (const point of projection) {
      let entry = byMonth.get(point.month);
      if (!entry) {
        entry = { month: point.month, count: 0, firstDate: point.date };
        byMonth.set(point.month, entry);
      }
      entry.count += 1;
    }
    return Array.from(byMonth.values());
  }, [projection]);

  if (!forecast?.enoughData) {
    return (
      <div className="dashboard-card-body">
        <div className="forecast-headline">
          <CalendarClock size={18} className="icon-inline" />
          <p className="muted">
            Need at least 2 laundry days to forecast. Submit more batches to unlock predictions.
          </p>
        </div>
      </div>
    );
  }

  const {
    nextLaundryDate,
    nextLaundryDateLow,
    nextLaundryDateHigh,
    daysUntilNext,
    averageGapDays,
    confidence,
    stdDevDays,
  } = forecast;
  const overdue = daysUntilNext != null && daysUntilNext < 0;
  const upcoming = projection.slice(0, 6);
  const cadenceLow = Math.max(1, averageGapDays - Math.round(stdDevDays));
  const cadenceHigh = Math.max(averageGapDays, averageGapDays + Math.round(stdDevDays));

  return (
    <div className="dashboard-card-body forecast-body">
      <div className="forecast-hero">
        <div className="forecast-next">
          <span className="meta-label">Next laundry</span>
          <strong className={`forecast-date ${overdue ? "forecast-overdue" : ""}`}>
            {formatDate(nextLaundryDate)}
          </strong>
          <span className={`forecast-countdown ${overdue ? "forecast-overdue" : ""}`}>
            {countdownLabel(daysUntilNext)}
          </span>
          <p className="forecast-range">
            Likely {formatDate(nextLaundryDateLow, { month: "short", day: "numeric" })} –{" "}
            {formatDate(nextLaundryDateHigh, { month: "short", day: "numeric" })}
          </p>
        </div>
        <div className="forecast-pills">
          <div className="forecast-pill">
            <span className="meta-label">Cycle</span>
            <strong>~{averageGapDays}d</strong>
          </div>
          <div className="forecast-pill">
            <span className="meta-label">Confidence</span>
            <strong>{Math.round(confidence * 100)}%</strong>
          </div>
          <div className="forecast-pill">
            <span className="meta-label">Next 6 mo</span>
            <strong>{projection.length} days</strong>
          </div>
        </div>
      </div>

      {intervalHistory.length ? (
        <div className="forecast-chart-block">
          <div className="forecast-section-head">
            <h3>Past cadence</h3>
            <span className="muted">days between each laundry</span>
          </div>
          <ChartContainer config={cadenceConfig} className="aspect-auto h-[180px] w-full">
            <AreaChart
              accessibilityLayer
              data={intervalHistory}
              margin={{ left: 4, right: 8, top: 8, bottom: 4 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => String(value).slice(5)}
              />
              <YAxis tickLine={false} axisLine={false} width={28} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <ReferenceArea
                y1={cadenceLow}
                y2={cadenceHigh}
                fill="var(--chart-5)"
                fillOpacity={0.15}
                stroke="none"
              />
              <ReferenceLine
                y={averageGapDays}
                stroke="var(--chart-5)"
                strokeDasharray="5 4"
                strokeWidth={2}
              />
              <Area
                dataKey="gapDays"
                type="monotone"
                stroke="var(--color-gapDays)"
                fill="var(--color-gapDays)"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
          <p className="forecast-caption">
            Each point is the gap between two of your past laundry days. The dashed line is your
            typical {averageGapDays}-day cycle; the shaded band is the normal ± variation.
          </p>
        </div>
      ) : null}

      {chartData.length ? (
        <div className="forecast-chart-block">
          <div className="forecast-section-head">
            <h3>6-month projection</h3>
            <span className="muted">when the next washes land</span>
          </div>
          <ChartContainer config={chartConfig} className="aspect-auto h-[200px] w-full">
            <ComposedChart
              accessibilityLayer
              data={chartData}
              margin={{ left: 4, right: 12, top: 8, bottom: 4 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                tickFormatter={(value) => formatDate(String(value), { month: "short", day: "numeric" })}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={36}
                tickFormatter={(value) => `${value}d`}
              />
              <ChartTooltip cursor={false} content={<ProjectionTooltip />} />
              <Area
                dataKey="band"
                stroke="none"
                fill="var(--color-band)"
                fillOpacity={0.15}
                isAnimationActive={false}
              />
              <Line
                dataKey="predicted"
                type="monotone"
                stroke="var(--color-predicted)"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={{ r: 3, fill: "var(--color-predicted)", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ChartContainer>
          <p className="forecast-caption">
            Reading this chart: each <strong>dot is a predicted laundry day</strong> over the next
            6 months. The y-axis is how many <strong>days from today</strong> that wash falls (so
            the line climbs as time passes). The shaded band shows how much the date could slip —
            it widens further out because small timing errors add up. Hover any dot for its exact
            date and ± window.
          </p>
        </div>
      ) : null}

      {forecast.loadForecast?.points?.length ? (
        <div className="forecast-chart-block">
          <div className="forecast-section-head">
            <h3>Forecasted load by category</h3>
            <span className="muted">modelled items per wash</span>
          </div>
          <ForecastLoadChart loadForecast={forecast.loadForecast} />
          <p className="forecast-caption">
            Per predicted wash day, the expected items per category from a{" "}
            <strong>recency-weighted trend</strong> fit to each category&apos;s history — not a flat
            average. Bars shift over time: rising items grow (then level off), fading items shrink
            toward zero. Open the formula for the equation.
          </p>
        </div>
      ) : null}

      {upcoming.length ? (
        <div className="forecast-upcoming">
          <div className="forecast-section-head">
            <h3>Upcoming days</h3>
          </div>
          <ul className="forecast-chips">
            {upcoming.map((point) => (
              <li key={point.date} className="forecast-chip">
                <span className="forecast-chip-weekday">
                  {formatDate(point.date, { weekday: "short" })}
                </span>
                <strong className="forecast-chip-day">
                  {formatDate(point.date, { month: "short", day: "numeric" })}
                </strong>
                <span className="forecast-chip-spread">
                  {point.spreadDays > 0 ? `±${point.spreadDays}d` : "exact"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {monthlyOutlook.length ? (
        <div className="forecast-monthly">
          <div className="forecast-section-head">
            <h3>Monthly outlook</h3>
          </div>
          <ul className="forecast-month-list">
            {monthlyOutlook.map((entry) => (
              <li key={entry.month}>
                <span>{formatMonth(entry.month)}</span>
                <strong>
                  {entry.count} {entry.count === 1 ? "wash" : "washes"}
                </strong>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Sheet>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="forecast-formula-trigger interactive focus-ring"
            />
          }
        >
          <Info size={15} className="icon-inline" /> How is this predicted?
        </SheetTrigger>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Forecast formula</SheetTitle>
            <SheetDescription>How the next laundry days are estimated.</SheetDescription>
          </SheetHeader>
          <ForecastFormula forecast={forecast} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
