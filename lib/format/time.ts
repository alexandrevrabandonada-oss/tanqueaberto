export function formatDateTimeBR(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function isYesterday(left: Date, right: Date) {
  const yesterday = new Date(right);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(left, yesterday);
}

export function formatRecencyLabel(value: string, referenceDate = new Date()) {
  const date = new Date(value);
  const diffMinutes = Math.round((referenceDate.getTime() - date.getTime()) / 60000);
  const diffHours = Math.round(diffMinutes / 60);

  if (diffMinutes <= 5) {
    return "agora";
  }

  if (diffMinutes < 60) {
    return `há ${diffMinutes} min`;
  }

  if (diffHours < 24) {
    return `há ${diffHours} hora${diffHours > 1 ? "s" : ""}`;
  }

  if (isSameDay(date, referenceDate)) {
    return "hoje";
  }

  if (isYesterday(date, referenceDate)) {
    return "ontem";
  }

  if (date.getFullYear() === referenceDate.getFullYear()) {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(date);
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}
