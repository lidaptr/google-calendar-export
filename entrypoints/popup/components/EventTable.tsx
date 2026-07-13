import { useState } from 'react';
import type { CalendarEvent } from '../types';

interface EventTableProps {
  events: CalendarEvent[];
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function EventTable({ events }: EventTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="border border-gray-200 rounded overflow-hidden text-xs">
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-[38%]" />
          <col className="w-[20%]" />
          <col className="w-[20%]" />
          <col className="w-[22%]" />
        </colgroup>
        <thead>
          <tr className="bg-gray-50 text-gray-600 text-left">
            <th className="px-2 py-1.5 font-medium border-b border-gray-200">Title</th>
            <th className="px-2 py-1.5 font-medium border-b border-gray-200">Start</th>
            <th className="px-2 py-1.5 font-medium border-b border-gray-200">End</th>
            <th className="px-2 py-1.5 font-medium border-b border-gray-200">Status</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event, idx) => {
            const isExpanded = expandedId === event.id;
            const hasDetails =
              Boolean(event.location) ||
              Boolean(event.description) ||
              event.attendees.length > 0;

            return (
              <>
                <tr
                  key={event.id}
                  onClick={() => toggleExpand(event.id)}
                  className={[
                    'cursor-pointer hover:bg-blue-50 transition-colors',
                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50',
                    isExpanded ? 'bg-blue-50' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <td className="px-2 py-1.5 border-b border-gray-100">
                    <span className="flex items-center gap-1.5 min-w-0">
                      {/* Color dot matching the event's Google Calendar color */}
                      <span
                        className="shrink-0 w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: event.colorHex }}
                        title={event.colorId ? `Calendar color ${event.colorId}` : 'Default color'}
                      />
                      <span className="font-medium text-gray-900 truncate">
                        {event.title}
                      </span>
                    </span>
                  </td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-gray-700">
                    {event.isAllDay ? 'All day' : formatTime(event.startTime)}
                  </td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-gray-700">
                    {event.isAllDay ? 'All day' : formatTime(event.endTime)}
                  </td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-gray-500 capitalize">
                    {event.status}
                  </td>
                </tr>
                {isExpanded && (
                  <tr key={`${event.id}-details`} className="bg-blue-50">
                    <td colSpan={4} className="px-3 py-2 border-b border-gray-100">
                      {!hasDetails ? (
                        <span className="text-gray-400 italic">No additional details</span>
                      ) : (
                        <div className="flex flex-col gap-1 text-gray-700">
                          {event.location && (
                            <div>
                              <span className="font-medium text-gray-500">Location: </span>
                              {event.location}
                            </div>
                          )}
                          {event.description && (
                            <div>
                              <span className="font-medium text-gray-500">Description: </span>
                              <span className="whitespace-pre-wrap">{event.description}</span>
                            </div>
                          )}
                          {event.attendees.length > 0 && (
                            <div>
                              <span className="font-medium text-gray-500">Attendees: </span>
                              {event.attendees.join(', ')}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
