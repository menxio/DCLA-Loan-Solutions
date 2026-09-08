import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRecentSmsActivity } from "../hooks/useRecentSmsActivity";
import DashboardPage from "./DashboardPage";

vi.mock("@components/layout/PrivateLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@features/auth/authStore", () => ({
  useAuthStore: () => ({ user: { email: "manager@dcla.test" } }),
}));

vi.mock("../hooks/useRecentSmsActivity", () => ({
  useRecentSmsActivity: vi.fn(),
}));

describe("DashboardPage", () => {
  const refetch = vi.fn(async () => undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRecentSmsActivity).mockReturnValue({
      data: {
        items: [],
        summary: { sentToday: 0, pending: 0, failedToday: 0 },
      },
      loading: false,
      error: null,
      refetch,
    });
  });

  const renderDashboard = () =>
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/approvals" element={<div>Approvals destination</div>} />
        </Routes>
      </MemoryRouter>,
    );

  it("renders the simplified operational dashboard", () => {
    renderDashboard();

    expect(
      screen.getByRole("heading", { name: "Dashboard", level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Overview of lending operations and recent activity."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Manager Command Center"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Collection approvals")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Review Approvals" }),
    ).toBeInTheDocument();
    expect(screen.getByText("SMS Notifications")).toBeInTheDocument();
    expect(screen.queryByText("Total Portfolio")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Center Exposure Overview"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Collection Pulse")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Open Portfolio" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "View All" }),
    ).not.toBeInTheDocument();
  });

  it("preserves the approvals navigation action", () => {
    renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: "Review Approvals" }));

    expect(screen.getByText("Approvals destination")).toBeInTheDocument();
  });

  it("refreshes recent SMS data through the read-only hook", () => {
    renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
