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
}

export interface Spreadsheet {
  id: string;
  name: string;
}
