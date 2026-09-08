import { describe, expect, it } from "vitest";
import { formatCollectionDatasetDate } from "../utils/date";

describe("formatCollectionDatasetDate", () => {
  it("formats a dataset calendar date without timezone shifting", () => {
    expect(formatCollectionDatasetDate("2026-09-07")).toBe("Sep 7, 2026");
    expect(formatCollectionDatasetDate("2026-09-03")).toBe("Sep 3, 2026");
  });

  it("preserves an invalid dataset date for diagnosis", () => {
    expect(formatCollectionDatasetDate("not-a-date")).toBe("not-a-date");
  });
});
