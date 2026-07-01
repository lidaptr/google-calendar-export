import { useEffect, useState } from 'react';
import type { CalendarEvent, Spreadsheet } from '../types';
import { getEventsForDate } from '../utils/calendar';
import { listSpreadsheets } from '../utils/drive';
import { exportToNewSheet, exportToExistingSheet } from '../utils/sheets';
import EventTable from './EventTable';

interface ExportViewProps {
  token: string;
  onSignOut: () => void;
}

type Destination = 'new' | 'existing';

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function ExportView({ token, onSignOut }: ExportViewProps) {
  const [date, setDate] = useState<string>(getTodayDateString());

  // Events state
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  // Destination state
  const [destination, setDestination] = useState<Destination>('new');
  const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([]);
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [sheetsError, setSheetsError] = useState<string | null>(null);
  const [selectedSheetId, setSelectedSheetId] = useState<string>('');

  // Export state
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [successUrl, setSuccessUrl] = useState<string | null>(null);

  // Fetch events whenever date changes
  useEffect(() => {
    setEventsError(null);
    setEvents([]);
    setSuccessUrl(null);
    setExportError(null);
    setEventsLoading(true);

    getEventsForDate(token, date)
      .then((data) => setEvents(data))
      .catch((err) => setEventsError(err instanceof Error ? err.message : 'Failed to load events.'))
      .finally(() => setEventsLoading(false));
  }, [date, token]);

  // Fetch spreadsheets when "existing" is chosen
  useEffect(() => {
    if (destination !== 'existing') return;
    setSheetsError(null);
    setSheetsLoading(true);
    setSelectedSheetId('');

    listSpreadsheets(token)
      .then((data) => {
        setSpreadsheets(data);
        if (data.length > 0) setSelectedSheetId(data[0].id);
      })
      .catch((err) =>
        setSheetsError(err instanceof Error ? err.message : 'Failed to load spreadsheets.'),
      )
      .finally(() => setSheetsLoading(false));
  }, [destination, token]);

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    setSuccessUrl(null);
    try {
      let result: { spreadsheetUrl: string };
      if (destination === 'new') {
        result = await exportToNewSheet(token, date, events);
      } else {
        result = await exportToExistingSheet(token, selectedSheetId, date, events);
      }
      setSuccessUrl(result.spreadsheetUrl);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  const exportDisabled =
    exporting ||
    events.length === 0 ||
    (destination === 'existing' && !selectedSheetId);

  return (
    <div className="flex flex-col h-full bg-white text-sm text-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <span className="font-semibold text-base">Calendar Export</span>
        <button
          onClick={onSignOut}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          Sign out
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4">
        {/* Date picker */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Events section */}
        <div>
          {eventsLoading && (
            <div className="flex items-center gap-2 text-gray-500 py-4 justify-center">
              <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span>Loading events…</span>
            </div>
          )}
          {eventsError && !eventsLoading && (
            <p className="text-red-600 text-xs py-2">{eventsError}</p>
          )}
          {!eventsLoading && !eventsError && events.length === 0 && (
            <p className="text-gray-500 text-sm py-4 text-center">No events on this date.</p>
          )}
          {!eventsLoading && !eventsError && events.length > 0 && (
            <EventTable events={events} />
          )}
        </div>

        {/* Destination section — only when events exist */}
        {events.length > 0 && !eventsLoading && (
          <div className="flex flex-col gap-3">
            <span className="text-xs font-medium text-gray-700">Export destination</span>
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="destination"
                  value="new"
                  checked={destination === 'new'}
                  onChange={() => setDestination('new')}
                  className="accent-blue-600"
                />
                <span>New spreadsheet</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="destination"
                  value="existing"
                  checked={destination === 'existing'}
                  onChange={() => setDestination('existing')}
                  className="accent-blue-600"
                />
                <span>Add to existing spreadsheet</span>
              </label>
            </div>

            {destination === 'existing' && (
              <div>
                {sheetsLoading && (
                  <p className="text-gray-500 text-xs">Loading sheets…</p>
                )}
                {sheetsError && (
                  <p className="text-red-600 text-xs">{sheetsError}</p>
                )}
                {!sheetsLoading && !sheetsError && spreadsheets.length === 0 && (
                  <p className="text-gray-500 text-xs">
                    No spreadsheets found — a new one will be created.
                  </p>
                )}
                {!sheetsLoading && !sheetsError && spreadsheets.length > 0 && (
                  <select
                    value={selectedSheetId}
                    onChange={(e) => setSelectedSheetId(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {spreadsheets.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        )}

        {/* Success banner */}
        {successUrl && (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded px-3 py-2">
            <span className="text-green-700 text-xs font-medium">Export successful!</span>
            <div className="flex items-center gap-2">
              <a
                href={successUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 text-xs underline hover:text-blue-800"
              >
                Open Sheet ↗
              </a>
              <button
                onClick={() => setSuccessUrl(null)}
                className="text-gray-400 hover:text-gray-600 text-xs leading-none"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Export error */}
        {exportError && (
          <p className="text-red-600 text-xs">{exportError}</p>
        )}
      </div>

      {/* Footer with export button */}
      <div className="px-4 py-3 border-t border-gray-200">
        <button
          onClick={handleExport}
          disabled={exportDisabled}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
        >
          {exporting ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Exporting…
            </>
          ) : (
            'Export to Google Sheets'
          )}
        </button>
      </div>
    </div>
  );
}
