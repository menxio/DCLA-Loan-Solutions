import { act, renderHook, waitFor } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import collectionsService from "../api";
import { useCollections, type CollectionsTab } from "./useCollections";
import type { DailyCollectionGroup } from "../types";

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

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const group = (
  centerName: string,
  collectionDate: string,
): DailyCollectionGroup => ({
  centerId: centerName,
  centerName,
  collectionDay: "Friday",
  collectionDate,
  totalAmount: 0,
  totalReceived: 0,
  totalMembers: 0,
  pendingCollections: 0,
  collections: [],
});

describe("useCollections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(collectionsService.getTodayCollections).mockResolvedValue([]);
    vi.mocked(collectionsService.getAllCollectionGroups).mockResolvedValue([]);
  });

  it("fetches only the active tab and preserves its independent error", async () => {
    vi.mocked(collectionsService.getTodayCollections).mockRejectedValue(
      forbiddenError(),
    );

    const { result } = renderHook(() => useCollections(0), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.errors.daily).toContain("permission");
    expect(result.current.errors.all).toBeNull();
    expect(result.current.dailyHasData).toBe(false);
    expect(result.current.allHasData).toBe(false);
    expect(collectionsService.getTodayCollections).toHaveBeenCalledTimes(1);
    expect(collectionsService.getAllCollectionGroups).not.toHaveBeenCalled();
  });

  it("loads the second tab only after it becomes active", async () => {
    const { result, rerender } = renderHook(
      ({ activeTab }: { activeTab: CollectionsTab }) =>
        useCollections(activeTab),
      {
        initialProps: { activeTab: 0 as CollectionsTab },
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => expect(result.current.loadingDaily).toBe(false));
    expect(result.current.dailyHasData).toBe(true);
    expect(result.current.dailyCollections).toHaveLength(0);
    expect(collectionsService.getAllCollectionGroups).not.toHaveBeenCalled();

    rerender({ activeTab: 1 });
    await waitFor(() => expect(result.current.loadingAll).toBe(false));
    expect(result.current.allHasData).toBe(true);
    expect(collectionsService.getTodayCollections).toHaveBeenCalledTimes(1);
    expect(collectionsService.getAllCollectionGroups).toHaveBeenCalledTimes(1);
  });

  it("keeps the newest dated response when an older request finishes later", async () => {
    const resolvers = new Map<
      string,
      (value: DailyCollectionGroup[]) => void
    >();
    vi.mocked(collectionsService.getAllCollectionGroups).mockImplementation(
      (date) =>
        new Promise((resolve) => {
          resolvers.set(date ?? "", resolve);
        }),
    );

    const { result } = renderHook(() => useCollections(1), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(resolvers.size).toBe(1));
    const oldDate = [...resolvers.keys()][0];

    act(() => result.current.setAllDate("2026-09-10"));
    await waitFor(() => expect(resolvers.has("2026-09-10")).toBe(true));
    await act(async () => {
      resolvers.get("2026-09-10")?.([group("Newest", "2026-09-10")]);
    });
    await waitFor(() =>
      expect(result.current.allCollections[0]?.centerName).toBe("Newest"),
    );

    await act(async () => {
      resolvers.get(oldDate)?.([group("Obsolete", oldDate)]);
    });
    expect(result.current.allCollections[0]?.centerName).toBe("Newest");
  });

  it("keeps successful counts available when switching between cached tabs", async () => {
    vi.mocked(collectionsService.getTodayCollections).mockResolvedValue([
      group("Daily One", "2026-09-05"),
      group("Daily Two", "2026-09-05"),
    ]);
    vi.mocked(collectionsService.getAllCollectionGroups).mockResolvedValue([
      group("All One", "2026-09-05"),
    ]);

    const { result, rerender } = renderHook(
      ({ activeTab }: { activeTab: CollectionsTab }) =>
        useCollections(activeTab),
      {
        initialProps: { activeTab: 0 as CollectionsTab },
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => expect(result.current.dailyHasData).toBe(true));
    expect(result.current.dailyCollections).toHaveLength(2);
    expect(result.current.allHasData).toBe(false);

    rerender({ activeTab: 1 });
    await waitFor(() => expect(result.current.allHasData).toBe(true));
    expect(result.current.allCollections).toHaveLength(1);

    rerender({ activeTab: 0 });
    expect(result.current.dailyHasData).toBe(true);
    expect(result.current.dailyCollections).toHaveLength(2);
    expect(result.current.allHasData).toBe(true);
    expect(result.current.allCollections).toHaveLength(1);
  });
});
