import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MemberCards from "./MemberCards";
import type { Member } from "../types";

vi.mock("@mui/icons-material", () => ({
  Edit: () => null,
  Delete: () => null,
  Phone: () => null,
  LocationOn: () => null,
  CalendarToday: () => null,
  Person: () => null,
  MoreVert: () => null,
  Business: () => null,
  AccountBalance: () => null,
  Savings: () => null,
}));

const member = {
  id: "member-a",
  firstName: "Evelyn",
  lastName: "Abordo",
  contactNumber: "09171234567",
  address: "Davao City",
} as Member;

describe("MemberCards savings entry point", () => {
  it("keeps the existing Savings action wired to the selected member", () => {
    const onAddSavings = vi.fn();
    render(
      <MemberCards
        members={[member]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onViewLoan={vi.fn()}
        onAddSavings={onAddSavings}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Savings" }));
    expect(onAddSavings).toHaveBeenCalledWith(member);
  });
});
