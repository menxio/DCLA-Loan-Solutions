import { renderHook, waitFor } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CentersAPI } from "../api";
import { useCenters } from "./useCenters";

vi.mock("../api", () => ({
  CentersAPI: { getAll: vi.fn() },
}));

describe("useCenters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(CentersAPI.getAll).mockRejectedValue(
      new AxiosError("missing", undefined, undefined, undefined, {
        status: 404,
        statusText: "Not Found",
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: { message: "internal lookup detail" },
      }),
    );
  });

  it("returns a clear resource-not-found state", async () => {
    const { result } = renderHook(() => useCenters());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("The requested resource was not found.");
    expect(result.current.error).not.toContain("internal lookup detail");
  });
});
