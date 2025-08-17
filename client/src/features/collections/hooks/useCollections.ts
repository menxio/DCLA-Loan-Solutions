import { useState, useEffect, useCallback } from "react";
import collectionsService from "../api";
import type {
  DailyCollectionGroup,
  Collection,
  CollectionFormData,
} from "../types.ts";

export function useCollections() {
  const [dailyCollections, setDailyCollections] = useState<
    DailyCollectionGroup[]
  >([]);
  const [allCollections, setAllCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDailyCollections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await collectionsService.getTodayCollections();
      setDailyCollections(data);
    } catch (err) {
      setError("Failed to fetch daily collections");
      console.error("Error fetching daily collections:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllCollections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await collectionsService.getAllCollections();
      setAllCollections(data);
    } catch (err) {
      setError("Failed to fetch all collections");
      console.error("Error fetching all collections:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCollection = useCallback(
    async (id: string, data: Partial<CollectionFormData>) => {
      try {
        setLoading(true);
        setError(null);
        await collectionsService.updateCollection(id, data);
        await fetchDailyCollections();
        await fetchAllCollections();
      } catch (err) {
        setError("Failed to update collection");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchDailyCollections, fetchAllCollections]
  );

  useEffect(() => {
    fetchDailyCollections();
    fetchAllCollections();
  }, [fetchDailyCollections, fetchAllCollections]);

  return {
    dailyCollections,
    allCollections,
    loading,
    error,
    updateCollection,
    refetchDaily: fetchDailyCollections,
    refetchAll: fetchAllCollections,
  };
}
