import { useState, useEffect, useCallback, useMemo } from "react";
import collectionsService, {
  type CollectionsQuery,
  type PaginatedCollections,
} from "../api.ts";
import type {
  DailyCollectionGroup,
  Collection,
  CollectionFormData,
} from "../types.ts";

export function useCollections() {
  const [dailyCollections, setDailyCollections] = useState<
    DailyCollectionGroup[]
  >([]);

  // Paginated collections state
  const [items, setItems] = useState<Collection[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState("");
  const [centerId, setCenterId] = useState<string | undefined>(undefined);
  const [memberId, setMemberId] = useState<string | undefined>(undefined);
  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<string | undefined>("collectionDate");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC" | undefined>(
    "DESC"
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce search to avoid too many API calls
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [search]);

  // Validate and clean search parameter
  const validatedSearch = useMemo(() => {
    const trimmed = debouncedSearch.trim();
    // Only include search if it's at least 2 characters long
    return trimmed.length >= 2 ? trimmed : undefined;
  }, [debouncedSearch]);

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

  const fetchCollections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query object, excluding undefined values
      const query: CollectionsQuery = {};

      if (page) query.page = page;
      if (limit) query.limit = limit;
      if (validatedSearch) query.search = validatedSearch;
      if (centerId) query.centerId = centerId;
      if (memberId) query.memberId = memberId;
      if (startDate) query.startDate = startDate;
      if (endDate) query.endDate = endDate;
      if (sortBy) query.sortBy = sortBy;
      if (sortOrder) query.sortOrder = sortOrder;

      console.log("Fetching collections with query:", query); // Debug log

      const data: PaginatedCollections =
        await collectionsService.getAllCollections(query);
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || "Failed to fetch collections";
      setError(errorMessage);
      console.error("Error fetching collections:", err);
      console.error("Error response:", err.response?.data); // Additional debug info
    } finally {
      setLoading(false);
    }
  }, [
    page,
    limit,
    validatedSearch, // Use validated search instead of raw search
    centerId,
    memberId,
    startDate,
    endDate,
    sortBy,
    sortOrder,
  ]);

  const updateCollection = useCallback(
    async (id: string, data: Partial<CollectionFormData>) => {
      try {
        setLoading(true);
        setError(null);
        await collectionsService.updateCollection(id, data);
        await fetchDailyCollections();
        await fetchCollections();
      } catch (err) {
        setError("Failed to update collection");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchDailyCollections, fetchCollections]
  );

  useEffect(() => {
    fetchDailyCollections();
  }, [fetchDailyCollections]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  return {
    // daily
    dailyCollections,
    refetchDaily: fetchDailyCollections,

    // paginated list
    items,
    total,
    page,
    limit,
    totalPages,
    setPage,
    setLimit,

    // filters/sort
    search,
    setSearch,
    centerId,
    setCenterId,
    memberId,
    setMemberId,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,

    // misc
    loading,
    error,
    updateCollection,
    refetchAll: fetchCollections,
  };
}
