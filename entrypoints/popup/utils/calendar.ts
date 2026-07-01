import type { CalendarEvent } from '../types';

interface GoogleCalendarEventItem {
  id?: string;
  summary?: string;
  start?: {
    dateTime?: string;
    date?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
  description?: string;
  attendees?: Array<{
    email?: string;
  }>;
  status?: string;
}

interface GoogleCalendarEventsResponse {
  items?: GoogleCalendarEventItem[];
}

export async function getEventsForDate(
  token: string,
  date: string,
): Promise<CalendarEvent[]> {
  const startOfDay = new Date(`${date}T00:00:00`);
  const endOfDay = new Date(`${date}T23:59:59.999`);

  const searchParams = new URLSearchParams({
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${searchParams.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch calendar events: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as GoogleCalendarEventsResponse;

  return (data.items ?? []).map((item) => ({
    id: item.id ?? '',
    title: item.summary ?? '(No title)',
    startTime: item.start?.dateTime ?? item.start?.date ?? '',
    endTime: item.end?.dateTime ?? item.end?.date ?? '',
    isAllDay: !item.start?.dateTime,
    location: item.location ?? '',
    description: item.description ?? '',
    attendees: item.attendees?.map((a) => a.email ?? '').filter(Boolean) ?? [],
    status: item.status ?? '',
  }));
}
