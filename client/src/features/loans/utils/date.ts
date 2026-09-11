const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

const collectionDateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export function formatCollectionDate(value?: string | null): string {
  const match = value?.match(dateOnlyPattern);
  if (!match) return "—";

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return "—";
  }

  return collectionDateFormatter.format(date);
}
