import type { CalendarEvent } from '../types';

interface CreateSpreadsheetResponse {
  spreadsheetId?: string;
}

interface GetSpreadsheetResponse {
  sheets?: Array<{
    properties?: {
      title?: string;
    };
  }>;
}

function getHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function throwResponseError(prefix: string, response: Response): Promise<never> {
  throw new Error(`${prefix}: ${response.status} ${response.statusText}`);
}

export function buildRows(events: CalendarEvent[]): string[][] {
  return [
    ['Title', 'Start', 'End', 'All Day', 'Location', 'Description', 'Attendees', 'Status'],
    ...events.map((event) => [
      event.title,
      event.startTime,
      event.endTime,
      String(event.isAllDay),
      event.location,
      event.description,
      event.attendees.join('; '),
      event.status,
    ]),
  ];
}

export async function exportToNewSheet(
  token: string,
  date: string,
  events: CalendarEvent[],
): Promise<{ spreadsheetUrl: string }> {
  const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({
      properties: { title: `Calendar Export – ${date}` },
      sheets: [{ properties: { title: date } }],
    }),
  });

  if (!createResponse.ok) {
    return throwResponseError('Failed to create spreadsheet', createResponse);
  }

  const createData = (await createResponse.json()) as CreateSpreadsheetResponse;
  const spreadsheetId = createData.spreadsheetId;

  const writeResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      `${date}!A1`,
    )}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify({ values: buildRows(events) }),
    },
  );

  if (!writeResponse.ok) {
    return throwResponseError('Failed to write spreadsheet data', writeResponse);
  }

  return {
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
  };
}

export async function exportToExistingSheet(
  token: string,
  spreadsheetId: string,
  date: string,
  events: CalendarEvent[],
): Promise<{ spreadsheetUrl: string }> {
  const spreadsheetResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
    {
      headers: getHeaders(token),
    },
  );

  if (!spreadsheetResponse.ok) {
    return throwResponseError('Failed to load spreadsheet tabs', spreadsheetResponse);
  }

  const spreadsheetData = (await spreadsheetResponse.json()) as GetSpreadsheetResponse;
  const existingTitles = new Set(
    (spreadsheetData.sheets ?? [])
      .map((sheet) => sheet.properties?.title)
      .filter((title): title is string => Boolean(title)),
  );

  let tabName = date;
  let suffix = 2;
  while (existingTitles.has(tabName)) {
    tabName = `${date} (${suffix})`;
    suffix += 1;
  }

  const addSheetResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({
        requests: [{ addSheet: { properties: { title: tabName } } }],
      }),
    },
  );

  if (!addSheetResponse.ok) {
    return throwResponseError('Failed to add spreadsheet tab', addSheetResponse);
  }

  const writeResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      `${tabName}!A1`,
    )}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify({ values: buildRows(events) }),
    },
  );

  if (!writeResponse.ok) {
    return throwResponseError('Failed to write spreadsheet data', writeResponse);
  }

  return {
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
  };
}
