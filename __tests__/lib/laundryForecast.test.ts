import {
  DECAY,
  addDays,
  addMonths,
  buildIntervalHistory,
  forecastNextLaundry,
  projectLaundryDays,
} from "@/lib/laundryForecast";

describe("addDays", () => {
  test("adds whole days across a month boundary in UTC", () => {
    // Arrange / Act
    const result = addDays("2026-01-30", 5);

    // Assert
    expect(result).toBe("2026-02-04");
  });

  test("supports negative offsets", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("forecastNextLaundry", () => {
  test("returns enoughData=false with fewer than two distinct days", () => {
    // Arrange
    const days = ["2026-05-01", "2026-05-01"]; // duplicate collapses to one

    // Act
    const forecast = forecastNextLaundry(days, "2026-05-10");

    // Assert
    expect(forecast.enoughData).toBe(false);
    expect(forecast.sampleSize).toBe(1);
    expect(forecast.nextLaundryDate).toBeNull();
  });

  test("predicts a steady weekly cycle exactly", () => {
    // Arrange — perfectly regular 7-day cadence
    const days = ["2026-05-03", "2026-05-10", "2026-05-17", "2026-05-24"];

    // Act
    const forecast = forecastNextLaundry(days, "2026-05-25");

    // Assert
    expect(forecast.enoughData).toBe(true);
    expect(forecast.gaps).toEqual([7, 7, 7]);
    expect(forecast.averageGapDays).toBe(7);
    expect(forecast.stdDevDays).toBe(0);
    expect(forecast.confidence).toBe(1);
    expect(forecast.lastLaundryDate).toBe("2026-05-24");
    expect(forecast.nextLaundryDate).toBe("2026-05-31");
    expect(forecast.daysUntilNext).toBe(6);
  });

  test("weights recent gaps more heavily than old ones", () => {
    // Arrange — old gaps of 10, most recent gap of 4
    const days = ["2026-01-01", "2026-01-11", "2026-01-21", "2026-01-25"];

    // Act
    const forecast = forecastNextLaundry(days, "2026-01-25");
    const simpleMean = (10 + 10 + 4) / 3; // 8

    // Assert — EWMA must sit below the simple mean, pulled toward the recent 4
    expect(forecast.gaps).toEqual([10, 10, 4]);
    expect(forecast.averageGapDays).toBeLessThan(Math.round(simpleMean));
  });

  test("produces a confidence band that widens with irregular gaps", () => {
    // Arrange — irregular cadence
    const days = ["2026-02-01", "2026-02-04", "2026-02-20", "2026-02-23"];

    // Act
    const forecast = forecastNextLaundry(days, "2026-02-23");

    // Assert
    expect(forecast.stdDevDays).toBeGreaterThan(0);
    expect(forecast.confidence).toBeLessThan(1);
    expect(forecast.nextLaundryDateLow).not.toBeNull();
    expect(forecast.nextLaundryDateHigh).not.toBeNull();
    // low bound is on or before the point estimate, high bound on or after
    expect(forecast.nextLaundryDateLow! <= forecast.nextLaundryDate!).toBe(true);
    expect(forecast.nextLaundryDateHigh! >= forecast.nextLaundryDate!).toBe(true);
  });

  test("reports a negative daysUntilNext when overdue", () => {
    // Arrange — predicted next day already in the past relative to today
    const days = ["2026-05-01", "2026-05-08"];

    // Act — today is well past last + 7
    const forecast = forecastNextLaundry(days, "2026-05-30");

    // Assert
    expect(forecast.nextLaundryDate).toBe("2026-05-15");
    expect(forecast.daysUntilNext).toBeLessThan(0);
  });

  test("ignores unparseable date strings", () => {
    const days = ["nonsense", "2026-05-03", "", "2026-05-10"];
    const forecast = forecastNextLaundry(days, "2026-05-11");
    expect(forecast.sampleSize).toBe(2);
    expect(forecast.gaps).toEqual([7]);
  });

  test("exposes the decay constant on the result", () => {
    const forecast = forecastNextLaundry(["2026-05-03", "2026-05-10"], "2026-05-11");
    expect(forecast.decay).toBe(DECAY);
  });
});

describe("addMonths", () => {
  test("adds whole months", () => {
    expect(addMonths("2026-01-15", 6)).toBe("2026-07-15");
  });

  test("clamps the day to the target month length", () => {
    // Aug 31 + 6 months = Feb -> clamp to 28 (2027 not leap)
    expect(addMonths("2026-08-31", 6)).toBe("2027-02-28");
  });
});

describe("projectLaundryDays", () => {
  test("returns empty when the forecast lacks data", () => {
    const forecast = forecastNextLaundry(["2026-05-01"], "2026-05-10");
    expect(projectLaundryDays(forecast, 6, "2026-05-10")).toEqual([]);
  });

  test("projects a steady cycle across a 6-month horizon", () => {
    // Arrange — regular 7-day cadence, zero variance
    const days = ["2026-05-03", "2026-05-10", "2026-05-17", "2026-05-24"];
    const forecast = forecastNextLaundry(days, "2026-05-24");

    // Act
    const projection = projectLaundryDays(forecast, 6, "2026-05-24");

    // Assert — every point inside horizon, evenly 7 days apart, zero spread
    const horizon = addMonths("2026-05-24", 6);
    expect(projection.length).toBeGreaterThan(20);
    expect(projection[0].date).toBe("2026-05-31");
    expect(projection[1].date).toBe("2026-06-07");
    expect(projection.every((p) => p.date <= horizon)).toBe(true);
    expect(projection.every((p) => p.spreadDays === 0)).toBe(true);
    expect(projection.every((p) => p.daysFromNow > 0)).toBe(true);
  });

  test("skips occurrences already in the past", () => {
    // Arrange — last laundry long ago, today well past several cycles
    const days = ["2026-01-01", "2026-01-08"]; // weekly
    const forecast = forecastNextLaundry(days, "2026-02-01");

    // Act
    const projection = projectLaundryDays(forecast, 6, "2026-02-01");

    // Assert — first projected day is in the future, not back in January
    expect(projection.length).toBeGreaterThan(0);
    expect(projection[0].daysFromNow).toBeGreaterThan(0);
    expect(projection[0].date > "2026-02-01").toBe(true);
  });

  test("widens the confidence window further into the future", () => {
    // Arrange — irregular gaps give non-zero stdDev
    const days = ["2026-02-01", "2026-02-04", "2026-02-20", "2026-02-23"];
    const forecast = forecastNextLaundry(days, "2026-02-23");

    // Act
    const projection = projectLaundryDays(forecast, 6, "2026-02-23");

    // Assert — spread is monotonically non-decreasing with occurrence
    for (let i = 1; i < projection.length; i += 1) {
      expect(projection[i].spreadDays).toBeGreaterThanOrEqual(projection[i - 1].spreadDays);
    }
    expect(projection[projection.length - 1].spreadDays).toBeGreaterThan(0);
  });
});

describe("buildIntervalHistory", () => {
  test("emits one gap point per day after the first", () => {
    // Arrange
    const days = ["2026-05-03", "2026-05-10", "2026-05-16"];

    // Act
    const history = buildIntervalHistory(days);

    // Assert
    expect(history).toEqual([
      { date: "2026-05-10", gapDays: 7 },
      { date: "2026-05-16", gapDays: 6 },
    ]);
  });

  test("returns an empty array for a single day", () => {
    expect(buildIntervalHistory(["2026-05-03"])).toEqual([]);
  });
});
