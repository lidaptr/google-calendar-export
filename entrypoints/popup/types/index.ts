export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  location: string;
  description: string;
  attendees: string[];
  status: string;
  /** Google Calendar colorId ("1"–"11"), or "" if using the calendar's default color */
  colorId: string;
  /** Resolved hex color (e.g. "#d50000") derived from colorId */
  colorHex: string;
}

export interface Spreadsheet {
  id: string;
  name: string;
}
