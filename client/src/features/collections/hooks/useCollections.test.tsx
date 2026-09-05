import { act, renderHook, waitFor } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import collectionsService from "../api";
import { useCollections } from "./useCollections";

vi.mock("../api", () => ({
  default: {
    getTodayCollections: vi.fn(),
    getAllCollectionGroups: vi.fn(),
    updateCollection: vi.fn(),
  },
}));

function forbiddenError() {
  return new AxiosError("forbidden", undefined, undefined, undefined, {
    status: 403,
    statusText: "Forbidden",
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: { message: "internal role detail" },
  });
}

describe("useCollections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(collectionsService.getTodayCollections).mockResolvedValue([]);
    vi.mocked(collectionsService.getAllCollectionGroups).mockResolvedValue([]);
  });

  it("keeps one request failure when another request succeeds", async () => {
    vi.mocked(collectionsService.getTodayCollections).mockRejectedValue(
      forbiddenError(),
    );

    const { result } = renderHook(() => useCollections());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.errors.daily).toContain("permission");
    expect(result.current.errors.all).toBeNull();

    await act(async () => {
      await result.current.refetchAll();
    });

    expect(result.current.errors.daily).toContain("permission");
    expect(result.current.errors.all).toBeNull();
  });
});
