# Laundry Category Forecast Equation

Date: 2026-05-31

## Purpose

Forecast the expected counts for each laundry category from previous submission data.

This should not be an incremental model with saved forecast state. Each forecast should be recomputed from the stored history so the output is explainable, repeatable, and easy to inspect.

## Current State

There is no forecasting equation currently implemented in the repo.

The current analytics logic is descriptive only:

```text
averageItemsPerSubmission = round(avg(items_with_values) * 10) / 10
mostFrequentItems = group by item_name, then sum(count) and count(rows)
channelSuccessRate = round(avg(channel_success) * 100, 1)
```

Relevant source:

- `lib/services/AnalyticsDB.ts` summarizes submissions and most frequent items.
- `app/api/submissions/route.ts` exposes the summary through `GET /api/submissions?type=summary`.
- `app/assets/data/list.tsx` is the category catalog used to map item names back to categories.

## Data Snapshot

Current database: `data/analytics.db`

- Submissions: 11
- Item rows: 138
- Date coverage: 2026-01-08 20:06:17 to 2026-05-28 04:50:19
- Distinct observed items: 18 of 36 predefined items
- Channels: all 11 are successful Discord submissions
- Category storage: category is not stored in SQLite; it must be inferred from `app/assets/data/list.tsx`
- Sparse storage: only non-zero item counts are stored, so missing predefined items should be treated as zero for forecasting
- Data quality issue: two submissions on 2026-03-02 are 27 seconds apart; treat the second same-day row as a duplicate/retry for forecasting unless confirmed otherwise

Category totals from all 11 submissions:

| Category | Historical Mean | Historical Median | Min | Max |
| --- | ---: | ---: | ---: | ---: |
| Regular Laundry | 53.09 | 52 | 26 | 81 |
| Home Items | 9.82 | 9 | 5 | 21 |
| Other Items | 0 | 0 | 0 | 0 |
| Total Units | 62.91 | 62 | 36 | 86 |

## Recommended Equation

Use the per-load category median as the default forecast.

The data currently behaves more like "one laundry batch per submission" than "items accumulated linearly by elapsed days." Because of that, normalizing by days adds noise unless the forecast explicitly targets a known future horizon.

Definitions:

```text
s = one historical submission
c = one category
x[c,s] = total count for category c in submission s
```

Data preparation:

```text
1. Sort submissions by timestamp ascending.
2. Infer category for each item from app/assets/data/list.tsx.
3. For every predefined item missing from a submission, use count = 0.
4. Keep only successful submissions.
5. Exclude duplicate/retry rows, currently intervals under 3 days.
```

Default forecast:

```text
forecast[c] = round(median(x[c,*]))
```

This is the right default when the question is:

```text
What should the next laundry batch look like by category?
```

### Optional Horizon Equation

Use a horizon-aware equation only when the user supplies a target number of days.

Definitions:

```text
d[s] = days since the previous submission
H = target forecast horizon in days
```

Rate equation:

```text
rate[c,s] = x[c,s] / d[s]
```

Robust historical rate:

```text
q1 = 25th percentile of rate[c,*]
q3 = 75th percentile of rate[c,*]
iqr = q3 - q1
low = q1 - 1.5 * iqr
high = q3 + 1.5 * iqr

robustRate[c] = mean(clamp(rate[c,s], low, high))
```

Horizon forecast:

```text
forecastForHorizon[c,H] = round(robustRate[c] * H)
```

Use this only for questions like:

```text
What should I expect if the next laundry run is 18 days from now?
```

## Model Check

Walk-forward scoring with at least 4 previous valid loads favors the per-load median as the default.

| Model | Regular Laundry MAE | Home Items MAE | Total MAE |
| --- | ---: | ---: | ---: |
| Per-load median | 11.17 | 4.67 | 12.00 |
| Per-load trimmed mean | 11.67 | 4.33 | 12.33 |
| Rate x median interval | 13.17 | 5.00 | 12.33 |
| 50/50 median + rate hybrid | 12.00 | 4.83 | 12.17 |

The rate-based model is still useful when a forecast horizon is supplied, but it should not be the default for category counts.

## Current Category Forecast

Using the default per-load median equation and excluding the likely 2026-03-02 duplicate/retry row:

| Category | Forecast For Next Laundry Batch |
| --- | ---: |
| Regular Laundry | 52 |
| Home Items | 9 |
| Other Items | 0 |
| Sum Of Category Forecasts | 61 |

If the UI needs an independent whole-load forecast, use the valid-row total median instead: `63`. If the UI needs category totals that add up cleanly, use the summed category forecasts: `61`.

For a horizon-aware forecast, the current median valid interval is 14.5 days. The previous robust rate model at that horizon produced:

| Category | Robust Rate Per Day | Forecast At 14.5 Days |
| --- | ---: | ---: |
| Regular Laundry | 3.520 | 51 |
| Home Items | 0.743 | 11 |
| Other Items | 0.000 | 0 |
| Total | 4.263 | 62 |

## Optional Item-Level Forecast

If the UI later needs suggested item counts, run the same median equation per item and then group those items under their category.

Current item-level median output for recurring non-zero signals:

| Category | Item | Frequency In Valid Rows | Forecast |
| --- | --- | ---: | ---: |
| Regular Laundry | T-shirts | 10/10 | 19 |
| Regular Laundry | Shorts | 10/10 | 15 |
| Regular Laundry | Socks (per pc. not pair) | 9/10 | 7 |
| Regular Laundry | Briefs / Boxers | 10/10 | 6 |
| Regular Laundry | Coats / Jackets | 9/10 | 3 |
| Regular Laundry | Sandos | 9/10 | 2 |
| Regular Laundry | Dusters | 8/10 | 2 |
| Regular Laundry | Pants | 8/10 | 2 |
| Regular Laundry | Polo shirts | 5/10 | 1 |
| Home Items | Blankets | 9/10 | 2 |
| Home Items | Pillowcases | 8/10 | 2 |
| Home Items | Towels / Face Towels | 10/10 | 2 |
| Home Items | Bed Sheets | 10/10 | 1 |

Treat rare one-off items as zero until more observations exist:

- Tablecloths: 1/10 valid rows
- Panties: excluded from valid recurring output
- Dresses: excluded from valid recurring output
- Other Items: no historical signal

## Why This Equation Fits The Use Case

- It is not incremental. It recomputes from the current historical database each time.
- It matches the current purpose: forecast the next laundry batch by category.
- It avoids pretending the small dataset proves a linear relationship between elapsed days and item count.
- It resists outliers by using medians instead of blindly following the latest submission.
- It works with the current schema because category can be inferred from item names.
- It stays simple enough to implement as a small service or report without introducing a forecasting framework.

## Implementation Notes

Minimum viable implementation:

1. Add a small forecast service that reads submissions and items from `AnalyticsDB`.
2. Map item names to categories from `app/assets/data/list.tsx`.
3. Compute category forecasts with the per-load median equation above.
4. Expose it as `GET /api/submissions?type=forecast`.

Do not persist forecast rows yet. The database is small, and recomputation keeps the result easier to trust.

Schema improvement for later:

- Store `category_name` on `submission_items` at record time, or add an immutable item catalog table. This prevents historical forecasts from changing if display names or category mappings change in `list.tsx`.
