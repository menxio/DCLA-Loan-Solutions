import { useState, useEffect, useCallback, useMemo } from "react";
import collectionsService from "../api.ts";
import type { DailyCollectionGroup, CollectionFormData } from "../types.ts";
import { getApiErrorMessage } from "@utils/apiError";

type LoadingKey = "daily" | "all" | "update";
type ErrorKey = LoadingKey;

const getLocalISODate = (date: Date) => date.toLocaleDateString("en-CA");

export function useCollections() {
  const [dailyCollections, setDailyCollections] = useState<
    DailyCollectionGroup[]
  >([]);
  const [allCollections, setAllCollections] = useState<DailyCollectionGroup[]>(
    [],
  );

  const [loadingMap, setLoadingMap] = useState<Record<LoadingKey, boolean>>({
    daily: true,
    all: true,
    update: false,
  });

  const [errorMap, setErrorMap] = useState<Record<ErrorKey, string | null>>({
    daily: null,
    all: null,
    update: null,
  });

  const [dailyDate] = useState<string>(() => getLocalISODate(new Date()));
  const [allDate, setAllDate] = useState<string>(() =>
    getLocalISODate(new Date()),
  );
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  const setLoading = useCallback((key: LoadingKey, value: boolean) => {
    setLoadingMap((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const setRequestError = useCallback((key: ErrorKey, value: string | null) => {
    setErrorMap((previous) => ({ ...previous, [key]: value }));
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
      setRequestError("daily", null);
      const data = await collectionsService.getTodayCollections(dailyDate);
      setDailyCollections(data);
    } catch (err) {
      console.error("Error fetching daily collections:", err);
      setRequestError("daily", getApiErrorMessage(err));
    } finally {
      setLoading("daily", false);
    }
  }, [dailyDate, setLoading, setRequestError]);

  const fetchAllCollections = useCallback(async () => {
    setLoading("all", true);
    try {
      setRequestError("all", null);
      const data = await collectionsService.getAllCollectionGroups(allDate);
      setAllCollections(data);
    } catch (err) {
      console.error("Error fetching all collections:", err);
      setRequestError("all", getApiErrorMessage(err));
    } finally {
      setLoading("all", false);
    }
  }, [allDate, setLoading, setRequestError]);

  useEffect(() => {
    fetchDailyCollections();
  }, [fetchDailyCollections]);

  useEffect(() => {
    fetchAllCollections();
  }, [fetchAllCollections, allDate]);

  const filteredDailyCollections = useMemo(() => {
    if (!validatedSearch) return dailyCollections;
    return dailyCollections.filter((group) =>
      group.centerName.toLowerCase().includes(validatedSearch.toLowerCase()),
    );
  }, [dailyCollections, validatedSearch]);

  const filteredAllCollections = useMemo(() => {
    if (!validatedSearch) return allCollections;
    return allCollections.filter((group) =>
      group.centerName.toLowerCase().includes(validatedSearch.toLowerCase()),
    );
  }, [allCollections, validatedSearch]);

  const totalAllCollectionItems = useMemo(
    () =>
      allCollections.reduce(
        (sum, group) => sum + (group.collections?.length ?? 0),
        0,
      ),
    [allCollections],
  );

  const updateCollection = useCallback(
    async (id: string, data: Partial<CollectionFormData>) => {
      setLoading("update", true);
      setRequestError("update", null);
      try {
        await collectionsService.updateCollection(id, data);
        await Promise.all([fetchDailyCollections(), fetchAllCollections()]);
      } catch (err) {
        console.error("Failed to update collection:", err);
        setRequestError("update", getApiErrorMessage(err));
        throw err;
      } finally {
        setLoading("update", false);
      }
    },
    [fetchDailyCollections, fetchAllCollections, setLoading, setRequestError],
  );

  const loading = loadingMap.daily || loadingMap.all || loadingMap.update;
  const error = errorMap.update ?? errorMap.daily ?? errorMap.all;

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
    errors: errorMap,
    updateCollection,
    refetchDaily: fetchDailyCollections,
    refetchAll: fetchAllCollections,
  };
}
