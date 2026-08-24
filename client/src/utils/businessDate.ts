const BUSINESS_TIME_ZONE = "Asia/Manila";
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const getBusinessDate = (value: string | Date = new Date()): string => {
  if (typeof value === "string" && DATE_ONLY_PATTERN.test(value)) {
    return value;
  }

  const instant = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(instant.getTime())) {
    return typeof value === "string" ? value : "";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
};

export const businessDateToUtcDate = (value: string | Date): Date => {
  const [year, month, day] = getBusinessDate(value)
    .split("-")
    .map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

export const businessDateToLocalDate = (value: string | Date): Date => {
  const [year, month, day] = getBusinessDate(value)
    .split("-")
    .map(Number);
  return new Date(year, month - 1, day);
};

export const localDateSelectionToBusinessDate = (value: Date): string =>
  [
    String(value.getFullYear()).padStart(4, "0"),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");

export const formatBusinessDate = (value?: string | Date | null): string => {
  if (!value) return "N/A";
  const date = businessDateToUtcDate(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, { timeZone: "UTC" }).format(date);
};

export const formatManilaDateTime = (value?: string | Date | null): string => {
  if (!value) return "N/A";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
};
