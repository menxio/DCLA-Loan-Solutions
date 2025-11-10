import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 10,
    textAlign: "left",
    fontSize: 8,
    color: "#0f172a",
  },
  header: {
    textAlign: "center",
    marginBottom: 10,
    fontSize: 14,
    fontWeight: "bold",
    color: "#1e3a8a",
  },
  subheader: {
    textAlign: "center",
    marginBottom: 12,
    fontSize: 10,
  },
  tableRow: {
    flexDirection: "row",
  },
  tableHeaderCell: {
    fontWeight: "bold",
    padding: 6,
    border: "0.75pt solid #cbd5f5",
    backgroundColor: "#e2e8f0",
  },
  tableCell: {
    fontWeight: "bold",
    padding: 6,
    border: "0.75pt solid #cbd5f5",
    fontSize: 8,
  },
  footer: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 8,
    color: "#64748b",
  },
});

const columnWidths = [
  "18%",
  "15%",
  "12%",
  "12%",
  "12%",
  "12%",
  "10%",
  "9%",
];

export interface CollectorRow {
  name: string;
  contact: string;
  loanAmount: string;
  amountDue: string;
  paymentReceived: string;
  paymentsMade: string;
  savings: string;
  status: string;
}

export async function exportCollectorPdf(params: {
  centerName: string;
  collectionDate: string;
  rows: CollectorRow[];
}) {
  const { centerName, collectionDate, rows } = params;

  const tableHeader = [
    "Name",
    "Contact Number",
    "Loan Amount",
    "Amount Due",
    "Payment",
    "# of Payment",
    "Savings",
    "Status",
  ];

  const doc = (
    <Document>
      <Page size="LETTER" orientation="portrait" style={styles.page}>
        <Text style={styles.header}>Collector Report</Text>
        <Text style={styles.subheader}>
          {centerName} • Collection Date: {collectionDate}
        </Text>

        <View style={{ border: "0.75pt solid #cbd5f5", marginBottom: 8 }}>
          <View style={styles.tableRow}>
            {tableHeader.map((header, idx) => (
              <Text
                key={header}
                style={[
                  styles.tableHeaderCell,
                  { width: columnWidths[idx] },
                  { textAlign: "center" },
                ]}
              >
                {header}
              </Text>
            ))}
          </View>

          {rows.map((row, rowIndex) => (
            <View style={styles.tableRow} key={`${row.name}-${rowIndex}`}>
              {[
                row.name,
                row.contact,
                row.loanAmount || "",
                row.amountDue || "",
                row.paymentReceived,
                row.paymentsMade,
                row.savings || "",
                row.status,
              ].map((value, colIndex) => (
                <Text
                  key={`${rowIndex}-${colIndex}`}
                  style={[
                    styles.tableCell,
                    { width: columnWidths[colIndex] },
                    {
                      textAlign: "left",
                    },
                  ]}
                >
                  {value}
                </Text>
              ))}
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          Prepared for collection monitoring • DCLA Loan Solutions
        </Text>
      </Page>
    </Document>
  );

  const blob = await pdf(doc).toBlob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `collector_report_${centerName
    .replace(/\s+/g, "_")
    .toLowerCase()}_${collectionDate.replace(/-/g, "_")}.pdf`;
  link.click();
}
