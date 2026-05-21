"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = `${process.env.NEXT_PUBLIC_API_URL}/api/availability`;

const DAYS = [
  { label: 'Sunday',    value: 0, short: 'Sun' },
  { label: 'Monday',    value: 1, short: 'Mon' },
  { label: 'Tuesday',   value: 2, short: 'Tue' },
  { label: 'Wednesday', value: 3, short: 'Wed' },
  { label: 'Thursday',  value: 4, short: 'Thu' },
  { label: 'Friday',    value: 5, short: 'Fri' },
  { label: 'Saturday',  value: 6, short: 'Sat' },
];

const TIMEZONES = [
  'Asia/Kolkata', 'America/New_York', 'America/Los_Angeles',
  'America/Chicago', 'Europe/London', 'Europe/Paris',
  'Asia/Tokyo', 'Australia/Sydney', 'UTC',
];

function timeOptions() {
  const opts = [];
  for (let h = 0; h < 24; h++) {
    for (let m of [0, 30]) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      const label = new Date(2000, 0, 1, h, m)
        .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      opts.push({ value: `${hh}:${mm}`, label });
    }
  }
  return opts;
}
const TIME_OPTS = timeOptions();

export default function AvailabilityPage() {
  const [schedule, setSchedule] = useState(
    DAYS.map(d => ({ dayOfWeek: d.value, enabled: d.value >= 1 && d.value <= 5, startTime: '09:00', endTime: '17:00' }))
  );
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await axios.get(API);
        if (r.data.length > 0) {
          setSchedule(DAYS.map(d => {
            const found = r.data.find(a => a.dayOfWeek === d.value);
            return found
              ? { dayOfWeek: d.value, enabled: true, startTime: found.startTime, endTime: found.endTime }
              : { dayOfWeek: d.value, enabled: false, startTime: '09:00', endTime: '17:00' };
          }));
        }
      } catch { toast.error('Failed to load availability'); }
      finally { setLoading(false); }
    })();
  }, []);

  function toggle(dayOfWeek) {
    setSchedule(s => s.map(d => d.dayOfWeek === dayOfWeek ? { ...d, enabled: !d.enabled } : d));
  }

  function update(dayOfWeek, field, value) {
    setSchedule(s => s.map(d => d.dayOfWeek === dayOfWeek ? { ...d, [field]: value } : d));
  }

  async function save() {
    setSaving(true);
    try {
      const payload = schedule.filter(d => d.enabled).map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime }));
      await axios.put(API, { availability: payload });
      toast.success('Availability saved!');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-2 border-[#0069ff] border-t-transparent rounded-full"/></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Availability</h1>
          <p className="text-gray-500 text-sm mt-1">Set when you're available for bookings each week</p>
        </div>
        <button onClick={save} disabled={saving}
          className="bg-[#0069ff] hover:bg-[#0054cc] disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors flex items-center gap-2">
          {saving && <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"/>}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Timezone */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Timezone</label>
        <select value={timezone} onChange={e => setTimezone(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0069ff] bg-white w-full max-w-xs">
          {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
        </select>
      </div>

      {/* Weekly Schedule */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Weekly hours</h2>
        </div>
        {DAYS.map((day, i) => {
          const slot = schedule.find(s => s.dayOfWeek === day.value);
          return (
            <div key={day.value} className={`flex items-center gap-4 px-5 py-4 ${i < DAYS.length - 1 ? 'border-b border-gray-100' : ''}`}>
              {/* Toggle */}
              <button onClick={() => toggle(day.value)}
                className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${slot.enabled ? 'bg-[#0069ff]' : 'bg-gray-200'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${slot.enabled ? 'left-[18px]' : 'left-0.5'}`}/>
              </button>
              {/* Day label */}
              <span className={`w-28 text-sm font-medium ${slot.enabled ? 'text-gray-800' : 'text-gray-400'}`}>{day.label}</span>
              {/* Time pickers */}
              {slot.enabled ? (
                <div className="flex items-center gap-2">
                  <select value={slot.startTime} onChange={e => update(day.value, 'startTime', e.target.value)}
                    className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0069ff] bg-white">
                    {TIME_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <span className="text-gray-400 text-sm">–</span>
                  <select value={slot.endTime} onChange={e => update(day.value, 'endTime', e.target.value)}
                    className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0069ff] bg-white">
                    {TIME_OPTS.filter(o => o.value > slot.startTime).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              ) : (
                <span className="text-sm text-gray-400">Unavailable</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}