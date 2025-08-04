import { useState, useEffect, useCallback } from "react";
import { MembersAPI } from "../api";
import type { Member, MemberFormData } from "../types";

export function useMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await MembersAPI.getAll();
      setMembers(data);
    } catch (err) {
      setError("Failed to fetch members");
      console.error("Error fetching members:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createMember = useCallback(
    async (data: MemberFormData) => {
      try {
        setLoading(true);
        setError(null);
        await MembersAPI.create(data);
        await fetchMembers();
      } catch (err) {
        setError("Failed to create member");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchMembers]
  );

  const updateMember = useCallback(
    async (id: string, data: MemberFormData) => {
      try {
        setLoading(true);
        setError(null);
        await MembersAPI.update(id, data);
        await fetchMembers();
      } catch (err) {
        setError("Failed to update member");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchMembers]
  );

  const deleteMember = useCallback(
    async (id: string) => {
      try {
        setLoading(true);
        setError(null);
        await MembersAPI.remove(id);
        await fetchMembers();
      } catch (err) {
        setError("Failed to delete member");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchMembers]
  );

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return {
    members,
    loading,
    error,
    createMember,
    updateMember,
    deleteMember,
    refetch: fetchMembers,
  };
}
