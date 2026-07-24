"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "motion/react";
import { CalendarClock, ChartColumn, Shirt, Sparkles } from "lucide-react";

import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AnalyticsResponse } from "@/components/analytics/types";
import { DEFAULT_RANGE, RANGE_PRESETS, type RangeKey } from "@/lib/analyticsRange";
import {
  containerVariants,
  itemVariants,
  microContainerVariants,
  microItemVariants,
  CountUp,
  DUR,
  EASE_OUT,
  EASE_EMPHASIZED,
} from "@/components/analytics/motion";

// All three charts load from ONE module specifier (lazyCharts) so recharts is
// bundled into a single shared async chunk instead of being duplicated per
// dynamic import. See components/analytics/lazyCharts.ts.
const CategoryAverageChart = dynamic(
  () =>
    import("@/components/analytics/lazyCharts").then(
      (mod) => mod.CategoryAverageChart,
    ),
  { ssr: false, loading: () => <div style={{ minHeight: 220 }} aria-hidden /> },
);
const CurrentLoadChart = dynamic(
  () =>
    import("@/components/analytics/lazyCharts").then(
      (mod) => mod.CurrentLoadChart,
    ),
  { ssr: false, loading: () => <div style={{ minHeight: 260 }} aria-hidden /> },
);
const LaundryForecastPanel = dynamic(
  () =>
    import("@/components/analytics/lazyCharts").then(
      (mod) => mod.LaundryForecastPanel,
    ),
  { ssr: false, loading: () => <div style={{ minHeight: 220 }} aria-hidden /> },
);

interface NextLaundryDescription {
  hasDate: boolean;
  urgency: "idle" | "overdue" | "soon" | "normal";
  dateLabel: string;
  countdown: string;
}

function describeNextLaundry(
  isoDate: string | null,
  daysUntil: number | null,
): NextLaundryDescription {
  if (!isoDate) {
    return {
      hasDate: false,
      urgency: "idle",
      dateLabel: "Not enough data yet",
      countdown: "Log a few loads to forecast",
    };
  }
  const [year, month, day] = isoDate.split("-").map(Number);
  const dateLabel = new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  let countdown = "";
  let urgency: NextLaundryDescription["urgency"] = "normal";
  if (typeof daysUntil === "number") {
    if (daysUntil < 0) {
      urgency = "overdue";
      countdown = `Overdue by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? "" : "s"}`;
    } else if (daysUntil === 0) {
      urgency = "soon";
      countdown = "Today";
    } else if (daysUntil === 1) {
      urgency = "soon";
      countdown = "Tomorrow";
    } else if (daysUntil <= 2) {
      urgency = "soon";
      countdown = `In ${daysUntil} days`;
    } else {
      countdown = `In ${daysUntil} days`;
    }
  }

  return { hasDate: true, urgency, dateLabel, countdown };
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [range, setRange] = useState<RangeKey>(DEFAULT_RANGE);
  const reduce = useReducedMotion();

  // Container/item entrance props, disabled wholesale under reduced motion.
  const revealContainer = reduce
    ? {}
    : { variants: containerVariants, initial: "hidden", animate: "show" };
  const revealItem = reduce ? {} : { variants: itemVariants };

  const loadData = useCallback(async () => {
    const res = await fetch(`/api/analytics?range=${range}`, {
      cache: "no-store",
    });
    if (res.ok) {
      setAnalytics((await res.json()) as AnalyticsResponse);
    }
  }, [range]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timeout);
  }, [loadData]);

  const totalSubmissions = analytics?.totalSubmissions ?? 0;
  const successfulSubmissions = analytics?.successfulSubmissions ?? 0;
  const successRate = totalSubmissions
    ? Math.round((successfulSubmissions / totalSubmissions) * 100)
    : 0;
  const items = analytics?.items ?? [];
  const categoryAverages = analytics?.categoryAverages ?? [];
  const categoryTimeline = analytics?.categoryTimeline ?? [];
  const forecast = analytics?.forecast ?? null;
  const intervalHistory = analytics?.intervalHistory ?? [];

  const topForecastCategories = useMemo(() => {
    const nextLoad = forecast?.loadForecast?.points?.[0]?.byCategory;
    if (!nextLoad) return [];
    return Object.entries(nextLoad)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [forecast?.loadForecast?.points]);

  const nextLaundry = useMemo(
    () => describeNextLaundry(forecast?.nextLaundryDate ?? null, forecast?.daysUntilNext ?? null),
    [forecast?.nextLaundryDate, forecast?.daysUntilNext],
  );

  const daily = useMemo(() => analytics?.daily ?? [], [analytics?.daily]);
  const dailyMax = useMemo(
    () => Math.max(...daily.map((d) => Number(d.count)), 1),
    [daily],
  );

  return (
    <div className="dashboard-shell">
      <div className="dashboard-content dashboard-stack">
        <motion.div className="laundry-overview-grid" {...revealContainer}>
          <motion.header
            className="hero card dashboard-card dashboard-card-hero"
            {...revealItem}
          >
            <p className="dashboard-kicker">Laundry Operations</p>
            <h1>
              <Shirt size={20} className="icon-inline" /> Laundry Analytics
            </h1>
            <div
              className="analytics-range-filter"
              role="group"
              aria-label="Filter analytics by date range"
            >
              {RANGE_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  className="analytics-range-chip"
                  data-active={range === preset.key}
                  aria-pressed={range === preset.key}
                  onClick={() => setRange(preset.key)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </motion.header>

          <motion.section
            className="card dashboard-card dashboard-card-analytics laundry-summary-card"
            aria-labelledby="laundry-summary-heading"
            {...revealItem}
          >
            <header className="dashboard-card-header">
              <h2 id="laundry-summary-heading">
                <ChartColumn size={18} className="icon-inline" /> Laundry Summary
              </h2>
            </header>
            <div className="dashboard-card-body">
              <div
                className={`forecast-highlight forecast-highlight-${nextLaundry.urgency}`}
                role="status"
                aria-label={`Next forecasted laundry ${nextLaundry.dateLabel}${nextLaundry.countdown ? `, ${nextLaundry.countdown}` : ""}`}
              >
                <span className="forecast-highlight-sheen" aria-hidden />
                <span className="forecast-highlight-icon" aria-hidden>
                  <CalendarClock size={22} />
                </span>
                <span className="forecast-highlight-text">
                  <span className="forecast-highlight-label">
                    Next forecasted laundry
                    {nextLaundry.hasDate ? (
                      <Sparkles size={13} className="forecast-highlight-spark" aria-hidden />
                    ) : null}
                  </span>
                  <strong className="forecast-highlight-date">{nextLaundry.dateLabel}</strong>
                  {nextLaundry.countdown ? (
                    <span className="forecast-highlight-countdown">{nextLaundry.countdown}</span>
                  ) : null}
                </span>
              </div>
              <div
                className="success-meter"
                role="img"
                aria-label={`Success rate ${successRate} percent`}
              >
                <div className="success-meter-head">
                  <span className="meta-label">Success rate</span>
                  <strong>
                    <CountUp value={successRate} suffix="%" />
                  </strong>
                </div>
                <div className="success-meter-track">
                  <motion.div
                    className="success-meter-fill"
                    initial={reduce ? false : { width: 0 }}
                    animate={{ width: `${successRate}%` }}
                    transition={{ duration: DUR.slow, ease: EASE_EMPHASIZED, delay: 0.15 }}
                  />
                </div>
              </div>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-muted-foreground">Total submissions</TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {analytics ? (
                        <CountUp value={analytics.totalSubmissions} />
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-muted-foreground">Average items</TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {analytics?.averageItemsPerSubmission ?? "-"}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-muted-foreground">Next load by category</TableCell>
                    <TableCell className="whitespace-normal text-right font-mono font-medium">
                      {topForecastCategories.length ? (
                        <motion.ul
                          className="flex flex-col gap-1"
                          variants={reduce ? undefined : microContainerVariants}
                          initial={reduce ? false : "hidden"}
                          animate={reduce ? false : "show"}
                        >
                          {topForecastCategories.map((category) => (
                            <motion.li
                              key={category.name}
                              variants={reduce ? undefined : microItemVariants}
                            >
                              {category.name}: {category.total}
                            </motion.li>
                          ))}
                        </motion.ul>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </motion.section>
        </motion.div>

        <Tabs defaultValue="current" className="laundry-tabs">
          <TabsList className="laundry-tabs-list">
            <TabsTrigger value="current">
              <ChartColumn data-icon="inline-start" /> Current
            </TabsTrigger>
            <TabsTrigger value="forecasting">
              <CalendarClock data-icon="inline-start" /> Forecasting
            </TabsTrigger>
          </TabsList>
          <TabsContent value="forecasting">
            <motion.section
              className="card dashboard-card dashboard-card-forecast"
              aria-labelledby="laundry-forecast-heading"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DUR.standard, ease: EASE_OUT }}
            >
              <header className="dashboard-card-header">
                <h2 id="laundry-forecast-heading">
                  <CalendarClock size={18} className="icon-inline" /> Laundry Forecast
                </h2>
              </header>
              <LaundryForecastPanel forecast={forecast} intervalHistory={intervalHistory} />
            </motion.section>
          </TabsContent>
          <TabsContent value="current">
            <motion.div
              className="dashboard-grid laundry-current-grid"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DUR.standard, ease: EASE_OUT }}
            >
              <section
                className="card dashboard-card dashboard-card-analytics"
                aria-labelledby="laundry-current-heading"
              >
                <header className="dashboard-card-header">
                  <h2 id="laundry-current-heading">
                    <ChartColumn size={18} className="icon-inline" /> Current Laundry Data
                  </h2>
                </header>
                <div className="dashboard-card-body">
                  <div className="forecast-chart-block">
                    <div className="forecast-section-head">
                      <h3>Current load by category</h3>
                      <span className="muted">actual item counts over time</span>
                    </div>
                    <CurrentLoadChart data={categoryTimeline} />
                  </div>
                  <div className="dual-col">
                    <div className="list-block">
                      <h3>Avg Per Category</h3>
                      <CategoryAverageChart data={categoryAverages} />
                      {!categoryAverages.length && items.length ? (
                        <ul className="compact-list">
                          {items.map((item) => (
                            <li key={item.name}>
                              <span>{item.name}</span>
                              <strong>{item.totalCount}</strong>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    <div className="list-block">
                      <h3>Last 7 Days</h3>
                      <div className="bars">
                        {daily.map((d, index) => {
                          const height = Math.max(
                            8,
                            Math.round((Number(d.count) / dailyMax) * 100),
                          );
                          return (
                            <div key={d.day} className="bar-wrap">
                              <motion.div
                                className="bar"
                                style={{ height: `${height}px` }}
                                initial={reduce ? false : { scaleY: 0 }}
                                animate={{ scaleY: 1 }}
                                transition={{
                                  duration: DUR.standard,
                                  ease: EASE_OUT,
                                  delay: 0.1 + index * 0.05,
                                }}
                              />
                              <span>{String(d.day).slice(5)}</span>
                              <strong>{d.count}</strong>
                            </div>
                          );
                        })}
                        {!daily.length ? <p className="muted">No daily data yet.</p> : null}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
