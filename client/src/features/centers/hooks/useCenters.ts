import { useState, useEffect, useCallback } from "react";
import { CentersAPI } from "../api";
import type {
  Center,
  CenterFormData,
  CentersQuery,
  PaginatedCenters,
} from "../types";
import { getApiErrorMessage } from "@utils/apiError";

export function useCenters() {
  const [centers, setCenters] = useState<Center[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(3);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCenters = useCallback(
    async (query?: CentersQuery) => {
      try {
        setLoading(true);
        setError(null);
        const merged: CentersQuery = { page, limit, search, ...(query || {}) };
        const data: PaginatedCenters | Center[] =
          await CentersAPI.getAll(merged);
        if (Array.isArray(data)) {
          setCenters(data);
          setTotal(data.length);
        } else {
          setCenters(data.items);
          setTotal(data.total);
        }
      } catch (err) {
        setError(getApiErrorMessage(err));
        console.error("Error fetching centers:", err);
      } finally {
        setLoading(false);
      }
    },
    [page, limit, search],
  );

  const createCenter = useCallback(
    async (data: CenterFormData) => {
      try {
        setLoading(true);
        setError(null);
        await CentersAPI.create(data);
        await fetchCenters();
      } catch (err) {
        setError(getApiErrorMessage(err));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchCenters],
  );

  const updateCenter = useCallback(
    async (id: string, data: CenterFormData) => {
      try {
        setLoading(true);
        setError(null);
        await CentersAPI.update(id, data);
        await fetchCenters();
      } catch (err) {
        setError(getApiErrorMessage(err));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchCenters],
  );

  const deleteCenter = useCallback(
    async (id: string) => {
      try {
        setLoading(true);
        setError(null);
        await CentersAPI.remove(id);
        await fetchCenters();
      } catch (err) {
        setError(getApiErrorMessage(err));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchCenters],
  );

  useEffect(() => {
    fetchCenters();
  }, [fetchCenters]);

  const handleSearchChange = useCallback((value: string) => {
    setPage(1);
    setSearch(value);
  }, []);

  return {
    centers,
    total,
    page,
    limit,
    setPage,
    setLimit,
    search,
    setSearch: handleSearchChange,
    loading,
    error,
    createCenter,
    updateCenter,
    deleteCenter,
    refetch: fetchCenters,
  };
}
