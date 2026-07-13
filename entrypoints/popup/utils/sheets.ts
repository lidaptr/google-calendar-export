import type { CalendarEvent } from '../types';

interface CreateSpreadsheetResponse {
  spreadsheetId?: string;
}

interface GetSpreadsheetResponse {
  sheets?: Array<{
    properties?: {
      title?: string;
      sheetId?: number;
    };
  }>;
}

interface BatchUpdateResponse {
  replies?: Array<{
    addSheet?: {
      properties?: {
        sheetId?: number;
        title?: string;
      };
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

/**
 * Converts a hex color string (e.g. "#d50000") to the RGB object format
 * required by the Google Sheets API, where each channel is a float 0–1.
 */
function hexToSheetsColor(hex: string): { red: number; green: number; blue: number } {
  const clean = hex.replace('#', '');
  return {
    red:   parseInt(clean.slice(0, 2), 16) / 255,
    green: parseInt(clean.slice(2, 4), 16) / 255,
    blue:  parseInt(clean.slice(4, 6), 16) / 255,
  };
}

/**
 * Builds the batchUpdate requests to color each data row's background
 * to match the event's Google Calendar color.
 * Row 0 is the header (skipped). Data rows start at row index 1.
 */
function buildColorRequests(
  sheetId: number,
  events: CalendarEvent[],
): object[] {
  return events.map((event, idx) => ({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: idx + 1, // +1 to skip header row
        endRowIndex:   idx + 2,
        startColumnIndex: 0,
        endColumnIndex: 2, // columns A–B only (Start + Title)
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: hexToSheetsColor(event.colorHex),
        },
      },
      fields: 'userEnteredFormat.backgroundColor',
    },
  }));
}

/**
 * Formats an ISO datetime string (e.g. "2026-07-01T09:00:00+01:00") to "HH:MM".
 * Returns "All day" for all-day events that have no time component.
 */
function formatTimeForSheet(isoString: string, isAllDay: boolean): string {
  if (isAllDay) return 'All day';
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function buildRows(events: CalendarEvent[]): string[][] {
  return [
    ['Start', 'Title'],
    ...events.map((event) => [
      formatTimeForSheet(event.startTime, event.isAllDay),
      event.title,
    ]),
  ];
}

export async function exportToNewSheet(
  token: string,
  date: string,
  events: CalendarEvent[],
): Promise<{ spreadsheetUrl: string }> {
  // Create spreadsheet — the default first sheet gets sheetId 0
  const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({
      properties: { title: `Calendar Export – ${date}` },
      sheets: [{ properties: { title: date, sheetId: 0 } }],
    }),
  });

  if (!createResponse.ok) {
    return throwResponseError('Failed to create spreadsheet', createResponse);
  }

  const createData = (await createResponse.json()) as CreateSpreadsheetResponse;
  const spreadsheetId = createData.spreadsheetId;

  // Write the data rows
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

  // Apply row background colors to match Google Calendar colors
  if (events.length > 0) {
    const colorResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ requests: buildColorRequests(0, events) }),
      },
    );
    if (!colorResponse.ok) {
      // Non-fatal: data is already written, colors are best-effort
      console.warn('Failed to apply row colors:', colorResponse.status, colorResponse.statusText);
    }
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
  // Fetch existing sheet titles AND sheetIds so we can color the new tab later
  const spreadsheetResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
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

  // Add the new tab and capture its sheetId from the response
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

  const addSheetData = (await addSheetResponse.json()) as BatchUpdateResponse;
  const newSheetId = addSheetData.replies?.[0]?.addSheet?.properties?.sheetId ?? 0;

  // Write the data rows
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

  // Apply row background colors to match Google Calendar colors
  if (events.length > 0) {
    const colorResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ requests: buildColorRequests(newSheetId, events) }),
      },
    );
    if (!colorResponse.ok) {
      // Non-fatal: data is already written, colors are best-effort
      console.warn('Failed to apply row colors:', colorResponse.status, colorResponse.statusText);
    }
  }

  return {
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
  };
}
