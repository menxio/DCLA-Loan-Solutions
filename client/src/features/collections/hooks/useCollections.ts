import { useState, useEffect, useCallback, useMemo } from "react";
import collectionsService from "../api.ts";
import type {
  DailyCollectionGroup,
  CollectionFormData,
} from "../types.ts";
import { getBusinessDate } from "@utils/businessDate";

type LoadingKey = "daily" | "all" | "update";

export function useCollections() {
  const [dailyCollections, setDailyCollections] = useState<
    DailyCollectionGroup[]
  >([]);
  const [allCollections, setAllCollections] = useState<
    DailyCollectionGroup[]
  >([]);

  const [loadingMap, setLoadingMap] = useState<Record<LoadingKey, boolean>>({
    daily: true,
    all: true,
    update: false,
  });

  const [error, setError] = useState<string | null>(null);

  const [dailyDate] = useState<string>(() => getBusinessDate());
  const [allDate, setAllDate] = useState<string>(() => getBusinessDate());
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  const setLoading = useCallback((key: LoadingKey, value: boolean) => {
    setLoadingMap((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const validatedSearch = useMemo(() => {
    const trimmed = debouncedSearch.trim();
    return trimmed.length >= 2 ? trimmed : undefined;
  }, [debouncedSearch]);

  const fetchDailyCollections = useCallback(async () => {
    setLoading("daily", true);
    try {
      setError(null);
      const data = await collectionsService.getTodayCollections(dailyDate);
      setDailyCollections(data);
    } catch (err) {
      console.error("Error fetching daily collections:", err);
      setError("Failed to fetch daily collections");
    } finally {
      setLoading("daily", false);
    }
  }, [dailyDate, setLoading]);

  const fetchAllCollections = useCallback(async () => {
    setLoading("all", true);
    try {
      setError(null);
      const data = await collectionsService.getAllCollectionGroups(allDate);
      setAllCollections(data);
    } catch (err) {
      console.error("Error fetching all collections:", err);
      setError("Failed to fetch all collections");
    } finally {
      setLoading("all", false);
    }
  }, [allDate, setLoading]);

  useEffect(() => {
    fetchDailyCollections();
  }, [fetchDailyCollections]);

  useEffect(() => {
    fetchAllCollections();
  }, [fetchAllCollections, allDate]);

  const filteredDailyCollections = useMemo(() => {
    if (!validatedSearch) return dailyCollections;
    return dailyCollections.filter((group) =>
      group.centerName.toLowerCase().includes(validatedSearch.toLowerCase())
    );
  }, [dailyCollections, validatedSearch]);

  const filteredAllCollections = useMemo(() => {
    if (!validatedSearch) return allCollections;
    return allCollections.filter((group) =>
      group.centerName.toLowerCase().includes(validatedSearch.toLowerCase())
    );
  }, [allCollections, validatedSearch]);

  const totalAllCollectionItems = useMemo(
    () =>
      allCollections.reduce(
        (sum, group) => sum + (group.collections?.length ?? 0),
        0
      ),
    [allCollections]
  );

  const updateCollection = useCallback(
    async (id: string, data: Partial<CollectionFormData>) => {
      setLoading("update", true);
      setError(null);
      try {
        await collectionsService.updateCollection(id, data);
        await Promise.all([fetchDailyCollections(), fetchAllCollections()]);
      } catch (err) {
        console.error("Failed to update collection:", err);
        setError("Failed to update collection");
        throw err;
      } finally {
        setLoading("update", false);
      }
    },
    [fetchDailyCollections, fetchAllCollections, setLoading]
  );

  const loading =
    loadingMap.daily || loadingMap.all || loadingMap.update;

  return {
    dailyCollections: filteredDailyCollections,
    allCollections: filteredAllCollections,
    totalDailyCenters: dailyCollections.length,
    totalAllCenters: allCollections.length,
    totalAllCollectionItems,
    search,
    setSearch,
    allDate,
    setAllDate,
    loading,
    loadingDaily: loadingMap.daily,
    loadingAll: loadingMap.all,
    error,
    updateCollection,
    refetchDaily: fetchDailyCollections,
    refetchAll: fetchAllCollections,
  };
}
