import { useState, useEffect, useCallback } from "react";
import { CentersAPI } from "../api";
import type { Center, CenterFormData } from "../types";

export function useCenters() {
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCenters = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await CentersAPI.getAll();
      setCenters(data);
    } catch (err) {
      setError("Failed to fetch centers");
      console.error("Error fetching centers:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createCenter = useCallback(
    async (data: CenterFormData) => {
      try {
        setLoading(true);
        setError(null);
        await CentersAPI.create(data);
        await fetchCenters();
      } catch (err) {
        setError("Failed to create center");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchCenters]
  );

  const updateCenter = useCallback(
    async (id: string, data: CenterFormData) => {
      try {
        setLoading(true);
        setError(null);
        await CentersAPI.update(id, data);
        await fetchCenters();
      } catch (err) {
        setError("Failed to update center");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchCenters]
  );

  const deleteCenter = useCallback(
    async (id: string) => {
      try {
        setLoading(true);
        setError(null);
        await CentersAPI.remove(id);
        await fetchCenters();
      } catch (err) {
        setError("Failed to delete center");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchCenters]
  );

  useEffect(() => {
    fetchCenters();
  }, [fetchCenters]);

  return {
    centers,
    loading,
    error,
    createCenter,
    updateCenter,
    deleteCenter,
    refetch: fetchCenters,
  };
}
