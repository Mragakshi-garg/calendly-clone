"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const API = `${process.env.NEXT_PUBLIC_API_URL}/api/bookings`;

export default function MeetingsPage() {
  const [tab, setTab] = useState('upcoming');
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState(null);

  useEffect(() => { load(); }, [tab]);

  async function load() {
    setLoading(true);
    try {
      const r = await axios.get(`${API}?status=${tab}`);
      const data = Array.isArray(r.data) ? r.data : [];
      // Filter: upcoming tab shows only UPCOMING, past tab shows all
      setMeetings(data.filter(m => tab === 'past' || m.status === 'UPCOMING'));
    } catch (err) {
      console.error('Failed to load meetings:', err);
      toast.error('Failed to load meetings');
    }
    finally { setLoading(false); }
  }

  async function cancelMeeting() {
    try {
      await axios.patch(`${API}/${cancelTarget.id}/cancel`);
      toast.success('Meeting cancelled');
      setCancelTarget(null);
      load();
    } catch { toast.error('Failed to cancel'); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Scheduled Events</h1>
        <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm gap-1">
          {['upcoming', 'past'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize
                ${tab === t ? 'bg-[#0069ff] text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-2 border-[#0069ff] border-t-transparent rounded-full"/></div>
      ) : meetings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-[#0069ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No {tab} meetings</h3>
          <p className="text-gray-500 text-sm">
            {tab === 'upcoming' ? 'Share your booking link to get started' : 'Completed meetings will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map(m => (
            <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-start justify-between gap-4 hover:shadow-sm transition-shadow">
              <div className="flex gap-4 flex-1 min-w-0">
                {/* Date block */}
                <div className="bg-blue-50 rounded-lg px-3 py-2 text-center shrink-0 w-16">
                  <p className="text-xs text-[#0069ff] font-semibold uppercase">{format(new Date(m.startTime), 'MMM')}</p>
                  <p className="text-2xl font-bold text-gray-900 leading-none mt-0.5">{format(new Date(m.startTime), 'd')}</p>
                </div>
                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900">{m.eventType?.name || 'Meeting'}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {format(new Date(m.startTime), 'h:mm a')} – {format(new Date(m.endTime), 'h:mm a')}
                    &nbsp;·&nbsp;{format(new Date(m.startTime), 'EEEE, MMMM d, yyyy')}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                      {m.inviteeName ? m.inviteeName[0].toUpperCase() : '?'}
                    </div>
                    <p className="text-sm text-gray-600">{m.inviteeName || 'Unknown'}
                      <span className="text-gray-400"> · {m.inviteeEmail || ''}</span>
                    </p>
                  </div>
                </div>
              </div>
              {/* Status + Cancel */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  m.status === 'UPCOMING' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>{m.status}</span>
                {tab === 'upcoming' && m.status === 'UPCOMING' && (
                  <button onClick={() => setCancelTarget(m)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium hover:underline">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cancel confirmation */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl text-center">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Cancel this meeting?</h3>
            <p className="text-sm text-gray-500 mb-1">{cancelTarget.eventType?.name}</p>
            <p className="text-sm text-gray-400 mb-5">{format(new Date(cancelTarget.startTime), 'PPPp')}</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setCancelTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Keep it</button>
              <button onClick={cancelMeeting} className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700">Yes, cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}