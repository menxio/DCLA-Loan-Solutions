import { useCallback, useEffect, useMemo, useState } from "react";
import { TransactionsAPI, type TransactionHistoryQuery } from "../api";
import type {
  TransactionFilterType,
  TransactionHistoryItem,
  TransactionHistoryResponse,
} from "../types";

type UseTransactionHistoryReturn = {
  transactions: TransactionHistoryItem[];
  loading: boolean;
  error: string | null;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  filters: TransactionFiltersState;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  updateFilters: (changes: Partial<TransactionFiltersState>) => void;
  refresh: () => Promise<void>;
};

export type TransactionFiltersState = {
  search: string;
  type: TransactionFilterType | "all";
  startDate: string;
  endDate: string;
};

const DEFAULT_FILTERS: TransactionFiltersState = {
  search: "",
  type: "all",
  startDate: "",
  endDate: "",
};

export function useTransactionHistory(
  initialLimit = 25
): UseTransactionHistoryReturn {
  const [transactions, setTransactions] = useState<TransactionHistoryItem[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(initialLimit);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] =
    useState<TransactionFiltersState>(DEFAULT_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    setPage(1);
  }, [filters.type, filters.startDate, filters.endDate, debouncedSearch]);

  const buildQuery = useCallback((): TransactionHistoryQuery => {
    const query: TransactionHistoryQuery = {
      page,
      limit,
    };

    if (filters.type && filters.type !== "all") {
      query.type = filters.type;
    }
    if (filters.startDate) {
      query.startDate = filters.startDate;
    }
    if (filters.endDate) {
      query.endDate = filters.endDate;
    }
    if (debouncedSearch) {
      query.search = debouncedSearch;
    }

    return query;
  }, [page, limit, filters.type, filters.startDate, filters.endDate, debouncedSearch]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const response: TransactionHistoryResponse =
        await TransactionsAPI.getHistory(buildQuery());
      setTransactions(response.items);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err) {
      console.error("Failed to load transactions:", err);
      setError("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
     
    fetchData();
  }, [fetchData]);

  const updateFilters = useCallback(
    (changes: Partial<TransactionFiltersState>) => {
      setFilters((prev) => ({ ...prev, ...changes }));
    },
    []
  );

  return useMemo(
    () => ({
      transactions,
      loading,
      error,
      page,
      limit,
      total,
      totalPages,
      filters,
      setPage,
      setLimit,
      updateFilters,
      refresh: fetchData,
    }),
    [
      transactions,
      loading,
      error,
      page,
      limit,
      total,
      totalPages,
      filters,
      fetchData,
      updateFilters,
    ]
  );
}
