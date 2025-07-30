import React, { useEffect, useState } from "react";
import MemberManagementLayout from "@components/layout/MemberManagementLayout";
import MemberManagementTable from "@components/table/MemberManagementTable";
import { MemberHTTP } from "./api";
import type { Member } from "./types";

export default function MemberManagementPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    MemberHTTP.getAllMembers()
      .then(data => setMembers(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <MemberManagementLayout>
      <MemberManagementTable members={members} />
      {loading && <p>Loading...</p>}
    </MemberManagementLayout>
  );
}