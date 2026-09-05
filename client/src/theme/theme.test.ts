import { describe, expect, it } from "vitest";
import { getContrastRatio, getLuminance } from "@mui/material/styles";
import { theme } from "./theme";

describe("UI foundation", () => {
  it("keeps predictable geometry and existing spacing compatibility", () => {
    expect(theme.shape.borderRadius).toBe(4);
    expect(theme.spacing(0.5)).toBe("4px");
    expect(theme.spacing(2)).toBe("16px");
    expect(theme.breakpoints.values.lg).toBe(1200);
  });
  it("uses a genuinely darker primary interaction color", () => {
    expect(getLuminance(theme.palette.primary.dark)).toBeLessThan(
      getLuminance(theme.palette.primary.main),
    );
  });
  it.each([
    "primary",
    "secondary",
    "success",
    "warning",
    "error",
    "info",
  ] as const)("provides readable %s contained foregrounds", (color) => {
    const palette = theme.palette[color];
    expect(
      getContrastRatio(palette.main, palette.contrastText),
    ).toBeGreaterThanOrEqual(4.5);
  });
});
