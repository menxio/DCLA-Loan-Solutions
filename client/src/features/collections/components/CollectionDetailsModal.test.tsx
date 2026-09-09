import { render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../../../theme/theme";
import CollectionDetailsModal from "./CollectionDetailsModal";

const getCenterMembers = vi.hoisted(() => vi.fn());
const getCenterCollectionsByDate = vi.hoisted(() => vi.fn());
const getPendingRepaymentsForCollection = vi.hoisted(() => vi.fn());

vi.mock("../api", () => ({
  default: {
    getCenterMembers,
    getCenterCollectionsByDate,
    getPendingRepaymentsForCollection,
  },
}));
vi.mock("@features/auth/authStore", () => ({
  useAuthStore: (selector: (state: { user: { role: string } }) => unknown) =>
    selector({ user: { role: "admin" } }),
}));
vi.mock("@mui/icons-material", () => ({
  CalendarToday: () => <span aria-hidden="true" />,
  CheckCircle: () => <span aria-hidden="true" />,
  Close: () => <span aria-hidden="true" />,
  Download: () => <span aria-hidden="true" />,
  LocationOn: () => <span aria-hidden="true" />,
  People: () => <span aria-hidden="true" />,
  PictureAsPdf: () => <span aria-hidden="true" />,
  Search: () => <span aria-hidden="true" />,
}));
vi.mock("./CollectionSummaryCards", () => ({
  CollectionSummaryCards: () => <div>Collection summary</div>,
}));
vi.mock("./MembersTable", () => ({
  MembersTable: () => <div>Member collection table</div>,
}));
vi.mock("./PaymentDialog", () => ({ PaymentDialog: () => null }));
vi.mock("./ReloanDialog", () => ({ ReloanDialog: () => null }));
vi.mock("@features/notifications/components/SendSmsConfirmationDialog", () => ({
  default: () => null,
}));

describe("CollectionDetailsModal", () => {
  beforeEach(() => {
    getCenterMembers.mockResolvedValue([]);
    getCenterCollectionsByDate.mockResolvedValue([]);
    getPendingRepaymentsForCollection.mockResolvedValue([]);
  });

  it("uses the local collection workspace width", async () => {
    render(
      <ThemeProvider theme={theme}>
        <CollectionDetailsModal
          open
          collectionGroup={{
            centerId: "center-1",
            centerName: "North Center",
            collectionDay: "Monday",
            collectionDate: "2026-09-07",
            totalAmount: 0,
            totalReceived: 0,
            totalMembers: 0,
            pendingCollections: 0,
            collections: [],
          }}
          onClose={vi.fn()}
        />
      </ThemeProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /North Center/ });
    expect(dialog).toHaveClass("MuiDialog-paperWidthFalse");
    expect(getComputedStyle(dialog).width).toBe("calc(100% - 32px)");
    expect(getComputedStyle(dialog).maxWidth).toBe("1100px");
    await waitFor(() => expect(getCenterMembers).toHaveBeenCalledOnce());
  });
});
