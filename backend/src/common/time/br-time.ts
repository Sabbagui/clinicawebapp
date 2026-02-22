const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';

type DateParts = {
  year: number;
  month: number;
  day: number;
};

function parseYYYYMMDD(dateYYYYMMDD: string): DateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateYYYYMMDD);
  if (!match) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD.');
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function getTimeZoneOffsetMinutes(utcMillis: number, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(utcMillis));

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const zonedAsUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );

  return (zonedAsUtc - utcMillis) / 60_000;
}

function localDateTimeToUtc(
  dateYYYYMMDD: string,
  timeHHMMSS: string,
  timezone: string,
): Date {
  const { year, month, day } = parseYYYYMMDD(dateYYYYMMDD);
  const [hour, minute, second] = timeHHMMSS.split(':').map(Number);
  const localTarget = Date.UTC(year, month - 1, day, hour, minute, second, 0);

  let utcMillis = localTarget;
  for (let i = 0; i < 3; i++) {
    const offsetMinutes = getTimeZoneOffsetMinutes(utcMillis, timezone);
    utcMillis = localTarget - offsetMinutes * 60_000;
  }

  return new Date(utcMillis);
}

function addDays(dateYYYYMMDD: string, days: number): string {
  const { year, month, day } = parseYYYYMMDD(dateYYYYMMDD);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);

  const nextYear = date.getUTCFullYear();
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  const nextDay = String(date.getUTCDate()).padStart(2, '0');
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

export function getDayRangeInTimeZone(dateYYYYMMDD: string, timezone: string) {
  const startUtc = localDateTimeToUtc(dateYYYYMMDD, '00:00:00', timezone);
  const endUtc = localDateTimeToUtc(addDays(dateYYYYMMDD, 1), '00:00:00', timezone);
  return { startUtc, endUtc };
}

export function getSaoPauloDayRange(dateYYYYMMDD: string) {
  return getDayRangeInTimeZone(dateYYYYMMDD, SAO_PAULO_TIMEZONE);
}

export function saoPauloDateAtNoonToUtc(dateYYYYMMDD: string): Date {
  return localDateTimeToUtc(dateYYYYMMDD, '12:00:00', SAO_PAULO_TIMEZONE);
}

export function toTimeZoneYYYYMMDD(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export function toSaoPauloYYYYMMDD(date: Date): string {
  return toTimeZoneYYYYMMDD(date, SAO_PAULO_TIMEZONE);
}

export function enumerateDays(startYYYYMMDD: string, endYYYYMMDD: string): string[] {
  const start = parseYYYYMMDD(startYYYYMMDD);
  const end = parseYYYYMMDD(endYYYYMMDD);
  const cursor = new Date(Date.UTC(start.year, start.month - 1, start.day));
  const endDate = new Date(Date.UTC(end.year, end.month - 1, end.day));
  const days: string[] = [];

  while (cursor <= endDate) {
    const year = cursor.getUTCFullYear();
    const month = String(cursor.getUTCMonth() + 1).padStart(2, '0');
    const day = String(cursor.getUTCDate()).padStart(2, '0');
    days.push(`${year}-${month}-${day}`);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

export function nowInSaoPaulo(): Date {
  return new Date();
}
