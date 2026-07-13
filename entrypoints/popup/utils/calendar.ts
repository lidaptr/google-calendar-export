import type { CalendarEvent } from '../types';

const FALLBACK_COLOR = '#4285f4'; // Google blue — only used if all API calls fail

interface GoogleCalendarEventItem {
  id?: string;
  summary?: string;
  colorId?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  location?: string;
  description?: string;
  attendees?: Array<{ email?: string }>;
  status?: string;
}

interface GoogleCalendarEventsResponse {
  items?: GoogleCalendarEventItem[];
}

interface ColorsApiResponse {
  event?: Record<string, { background?: string }>;
  calendar?: Record<string, { background?: string }>;
}

interface CalendarListEntry {
  colorId?: string;
  backgroundColor?: string;
}

/**
 * Fetches both the event and calendar colour palettes from Google's Colors API.
 * Also fetches the primary calendar's colorId from the calendarList.
 * Returns:
 *   - eventPalette: colorId → hex for event-level colours
 *   - calendarColor: the resolved hex for the primary calendar itself
 *     (used when an event has no explicit colorId)
 */
async function getColorData(token: string): Promise<{
  eventPalette: Record<string, string>;
  calendarColor: string;
}> {
  try {
    const [colorsRes, calListRes] = await Promise.all([
      fetch('https://www.googleapis.com/calendar/v3/colors', {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList/primary', {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    // Build event palette map
    const eventPalette: Record<string, string> = {};
    const calendarPalette: Record<string, string> = {};
    if (colorsRes.ok) {
      const colorsData = (await colorsRes.json()) as ColorsApiResponse;
      for (const [id, val] of Object.entries(colorsData.event ?? {})) {
        if (val.background) eventPalette[id] = val.background;
      }
      for (const [id, val] of Object.entries(colorsData.calendar ?? {})) {
        if (val.background) calendarPalette[id] = val.background;
      }
    }

    // Resolve the calendar's own colour:
    // 1. If the calendar has a colorId, look it up in the calendar palette
    // 2. Fall back to backgroundColor field
    // 3. Last resort: FALLBACK_COLOR
    let calendarColor = FALLBACK_COLOR;
    if (calListRes.ok) {
      const calListData = (await calListRes.json()) as CalendarListEntry;
      console.log('[CalendarExport] calendarList colorId:', calListData.colorId, '| backgroundColor:', calListData.backgroundColor);
      console.log('[CalendarExport] calendarPalette:', JSON.stringify(calendarPalette));
      if (calListData.colorId && calendarPalette[calListData.colorId]) {
        calendarColor = calendarPalette[calListData.colorId];
      } else if (calListData.backgroundColor) {
        calendarColor = calListData.backgroundColor;
      }
    }

    return { eventPalette, calendarColor };
  } catch {
    return { eventPalette: {}, calendarColor: FALLBACK_COLOR };
  }
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
    // Explicitly request colorId so Google always includes it even when set to a non-default value
    fields: 'items(id,summary,colorId,start,end,location,description,attendees,status)',
  });

  // Fetch events and colour data in parallel
  const [eventsResponse, { eventPalette, calendarColor }] = await Promise.all([
    fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${searchParams.toString()}`,
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
    ),
    getColorData(token),
  ]);

  if (!eventsResponse.ok) {
    throw new Error(`Failed to fetch calendar events: ${eventsResponse.status} ${eventsResponse.statusText}`);
  }

  const data = (await eventsResponse.json()) as GoogleCalendarEventsResponse;

  return (data.items ?? []).map((item) => {
    const colorId = item.colorId ?? '';
    // Event has explicit colour → use event palette
    // Event has no colour → inherit calendar colour (resolved via calendar palette)
    const colorHex = (colorId && eventPalette[colorId]) ? eventPalette[colorId] : calendarColor;
    return {
      id: item.id ?? '',
      title: item.summary ?? '(No title)',
      startTime: item.start?.dateTime ?? item.start?.date ?? '',
      endTime: item.end?.dateTime ?? item.end?.date ?? '',
      isAllDay: !item.start?.dateTime,
      location: item.location ?? '',
      description: item.description ?? '',
      attendees: item.attendees?.map((a) => a.email ?? '').filter(Boolean) ?? [],
      status: item.status ?? '',
      colorId,
      colorHex,
    };
  });
}
