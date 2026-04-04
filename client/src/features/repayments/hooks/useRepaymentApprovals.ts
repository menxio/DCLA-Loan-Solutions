import { useCallback, useEffect, useState } from "react";
import { repaymentsService } from "../api";
import type { Repayment } from "../types";

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
};

export function useRepaymentApprovals() {
  const [pending, setPending] = useState<Repayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingIds, setActingIds] = useState<Set<string>>(new Set());

  const updateActing = (id: string, isActing: boolean) => {
    setActingIds((prev) => {
      const next = new Set(prev);
      if (isActing) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await repaymentsService.getPending();
      setPending(data);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load pending repayments."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const approveRepayment = async (id: string) => {
    updateActing(id, true);
    try {
      await repaymentsService.approve(id);
      setPending((prev) => prev.filter((item) => item.id !== id));
    } finally {
      updateActing(id, false);
    }
  };

  const rejectRepayment = async (id: string, reason?: string) => {
    updateActing(id, true);
    try {
      await repaymentsService.reject(id, reason);
      setPending((prev) => prev.filter((item) => item.id !== id));
    } finally {
      updateActing(id, false);
    }
  };

  return {
    pending,
    loading,
    error,
    actingIds,
    refresh: fetchPending,
    approveRepayment,
    rejectRepayment,
  };
}
