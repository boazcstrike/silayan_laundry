import {
  CAP_MULT,
  LOAD_DECAY,
  forecastCategoryLoads,
} from "@/lib/laundryLoadForecast";

const LAUNDRY_DAYS = ["2026-01-01", "2026-01-15", "2026-01-29", "2026-02-12"];

describe("forecastCategoryLoads", () => {
  test("returns empty when there is no history or no projection", () => {
    expect(forecastCategoryLoads([], LAUNDRY_DAYS, ["2026-03-01"])).toEqual({
      categories: [],
      points: [],
    });
    expect(forecastCategoryLoads([{ day: "2026-01-01", name: "Socks", count: 4 }], LAUNDRY_DAYS, []))
      .toEqual({ categories: [], points: [] });
  });

  test("forecast varies across days and across categories (not flat)", () => {
    // Arrange — "Shirts" trends up, "Towels" trends down over the same batches
    const history = [
      { day: "2026-01-01", name: "Shirts", count: 4 },
      { day: "2026-01-15", name: "Shirts", count: 8 },
      { day: "2026-01-29", name: "Shirts", count: 12 },
      { day: "2026-02-12", name: "Shirts", count: 16 },
      { day: "2026-01-01", name: "Towels", count: 10 },
      { day: "2026-01-15", name: "Towels", count: 7 },
      { day: "2026-01-29", name: "Towels", count: 4 },
      { day: "2026-02-12", name: "Towels", count: 1 },
    ];
    const projection = ["2026-02-26", "2026-03-12", "2026-03-26"];

    // Act
    const result = forecastCategoryLoads(history, LAUNDRY_DAYS, projection);

    // Assert — categories differ, and each category's value changes day to day
    const shirts = result.points.map((p) => p.byCategory["Shirts"]);
    const towels = result.points.map((p) => p.byCategory["Towels"] ?? 0);
    expect(new Set(shirts).size).toBeGreaterThan(1); // not flat
    expect(shirts[0]).not.toBe(towels[0]); // categories differ
    // rising series keeps rising into the near future
    expect(shirts[1]).toBeGreaterThanOrEqual(shirts[0]);
    // falling series stays at/under its last level
    expect(towels[0]).toBeLessThanOrEqual(7);
  });

  test("a rising trend is capped at CAP_MULT × historical max", () => {
    // Arrange — steep climb, max observed = 20
    const history = [
      { day: "2026-01-01", name: "Tees", count: 5 },
      { day: "2026-01-15", name: "Tees", count: 10 },
      { day: "2026-01-29", name: "Tees", count: 15 },
      { day: "2026-02-12", name: "Tees", count: 20 },
    ];
    // far-future date so the trend would blow past the cap without damping/clip
    const projection = ["2026-08-01"];

    // Act
    const result = forecastCategoryLoads(history, LAUNDRY_DAYS, projection);

    // Assert
    expect(result.points[0].byCategory["Tees"]).toBeLessThanOrEqual(20 * CAP_MULT);
  });

  test("a recently-absent one-off category decays toward zero", () => {
    // Arrange — appeared only on the first batch, absent since
    const history = [{ day: "2026-01-01", name: "Dress", count: 3 }];
    const projection = ["2026-02-26"];

    // Act
    const result = forecastCategoryLoads(history, LAUNDRY_DAYS, projection);

    // Assert — recency weighting + zero-fill pushes the expectation to ~0,
    // so it is dropped from the basket
    expect(result.points[0].byCategory["Dress"]).toBeUndefined();
  });

  test("ranks categories by total forecasted volume", () => {
    const history = [
      { day: "2026-01-01", name: "Big", count: 20 },
      { day: "2026-02-12", name: "Big", count: 22 },
      { day: "2026-01-01", name: "Small", count: 2 },
      { day: "2026-02-12", name: "Small", count: 3 },
    ];
    const result = forecastCategoryLoads(history, LAUNDRY_DAYS, ["2026-02-26", "2026-03-12"]);
    expect(result.categories[0].name).toBe("Big");
  });

  test("exposes the decay constant", () => {
    expect(LOAD_DECAY).toBe(0.7);
  });
});
