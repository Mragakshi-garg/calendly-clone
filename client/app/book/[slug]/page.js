"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, addMinutes } from 'date-fns';
import toast from 'react-hot-toast';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api`;

export default function BookingPage() {
  const { slug } = useParams();

  const [step, setStep] = useState(1);
  const [eventType, setEventType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedTime, setSelectedTime] = useState(null);

  const [formData, setFormData] = useState({ name: '', email: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const res = await axios.get(`${API_URL}/event-types/${slug}`);
        setEventType(res.data);
      } catch {
        setError('Event type not found or is inactive.');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const fetchSlots = useCallback(async () => {
    if (!eventType) return;
    try {
      setSlotsLoading(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const res = await axios.get(`${API_URL}/bookings/slots?slug=${slug}&date=${dateStr}`);
      setAvailableSlots(res.data);
    } catch {
      setAvailableSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [selectedDate, eventType, slug]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  const buildStartDate = () => {
    const [h, m] = selectedTime.split(':').map(Number);
    const d = new Date(selectedDate);
    d.setHours(h, m, 0, 0);
    return d;
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setSelectedTime(null);
  };

  const proceedToForm = (time) => {
    setSelectedTime(time);
    setStep(2);
  };

  const submitBooking = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const startTime = buildStartDate();
      await axios.post(`${API_URL}/bookings`, {
        eventTypeId: eventType.id,
        inviteeName: formData.name,
        inviteeEmail: formData.email,
        startTime: startTime.toISOString(),
      });
      toast.success('Meeting scheduled successfully!');
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to book. The slot might already be taken.');
      fetchSlots();
      setStep(1);
    } finally {
      setSubmitting(false);
    }
  };

  const generateGoogleCalendarUrl = () => {
    if (!eventType || !selectedTime) return '#';
    const start = buildStartDate();
    const end = addMinutes(start, eventType.duration);
    const fmt = (d) => d.toISOString().replace(/-|:|\.\d{3}/g, '');
    const url = new URL('https://calendar.google.com/calendar/render');
    url.searchParams.set('action', 'TEMPLATE');
    url.searchParams.set('text', `${eventType.name} with ${eventType.user?.name || 'Host'}`);
    url.searchParams.set('dates', `${fmt(start)}/${fmt(end)}`);
    url.searchParams.set('details', `Event: ${eventType.name}\nBooked by: ${formData.name}`);
    return url.toString();
  };

  // Replace this:
// const tileDisabled = ({ date, view }) => {
//   if (view !== 'month') return false;
//   const day = date.getDay();
//   return day === 0 || day === 6;
// };

// With this (add availableDays state and fetch):
// 1. Add state near top:
const [availableDays, setAvailableDays] = useState([1,2,3,4,5]); // defaults Mon-Fri

// 2. After eventType is loaded, fetch availability:
useEffect(() => {
  if (!eventType) return;
  axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/availability`)
    .then(r => setAvailableDays(r.data.map(a => a.dayOfWeek)))
    .catch(() => {});
}, [eventType]);

// 3. Updated tileDisabled:
const tileDisabled = ({ date, view }) => {
  if (view !== 'month') return false;
  const today = new Date(); today.setHours(0,0,0,0);
  if (date < today) return true;
  return !availableDays.includes(date.getDay());
};

  // ---- computed ----
  const endTimeStr = selectedTime && eventType
    ? format(addMinutes(buildStartDate(), eventType.duration), 'HH:mm')
    : '';

  // ---- RENDER ----

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error || !eventType) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-2xl shadow-sm text-center max-w-md w-full">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Not Found</h2>
          <p className="text-gray-500">{error || 'Something went wrong.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 py-8 md:py-12 font-sans">
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] max-w-5xl w-full overflow-hidden flex flex-col md:flex-row min-h-[500px] md:min-h-[600px] border border-gray-100">

        {/* ======= LEFT PANEL ======= */}
        <div className="w-full md:w-[340px] lg:w-[380px] bg-white border-b md:border-b-0 md:border-r border-gray-100 p-6 md:p-8 flex flex-col shrink-0">
          <div className="flex items-center gap-2 mb-6 md:mb-8">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-200">S</div>
            <span className="text-sm font-bold text-gray-400 tracking-wide">Schedulr</span>
          </div>
          <p className="text-gray-500 font-semibold text-sm mb-1">{eventType.user?.name || 'Host'}</p>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-6">{eventType.name}</h1>
          <div className="space-y-4 text-gray-600 text-sm">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{eventType.duration} min</span>
            </div>
            {step >= 2 && selectedTime && (
              <div className="flex items-start gap-3 text-indigo-600 font-medium">
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{selectedTime} – {endTimeStr}<br />{format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
              </div>
            )}
            {eventType.description && <p className="mt-4 leading-relaxed text-gray-500">{eventType.description}</p>}
          </div>
        </div>

        {/* ======= RIGHT PANEL ======= */}
        <div className="flex-1 bg-white p-4 sm:p-6 md:p-8 overflow-y-auto">

          {/* STEP 1 */}
          {step === 1 && (
            <div className="h-full flex flex-col lg:flex-row gap-6 md:gap-8">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-5">Select a Date &amp; Time</h3>
                <Calendar
                  onChange={handleDateChange}
                  value={selectedDate}
                  minDate={new Date()}
                  tileDisabled={tileDisabled}
                  className="border-none w-full !font-sans"
                />
              </div>
              <div className="w-full lg:w-52 flex flex-col">
                <p className="text-sm font-semibold text-gray-500 mb-4 text-center">{format(selectedDate, 'EEEE, MMM d')}</p>
                <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[300px] lg:max-h-[400px]">
                  {slotsLoading ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                      <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      <p className="text-sm">No times available</p>
                    </div>
                  ) : (
                    availableSlots.map((time) => (
                      <button key={time} onClick={() => proceedToForm(time)} className="w-full py-3 border-2 border-indigo-100 text-indigo-600 font-bold rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                        {time}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="max-w-md mx-auto lg:mx-0">
              <button onClick={() => setStep(1)} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 mb-8 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Enter Details</h3>
              <form onSubmit={submitBooking} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Full Name *</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="John Doe" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Email Address *</label>
                  <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="john@example.com" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                </div>
                <button type="submit" disabled={submitting} className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 mt-4 flex items-center justify-center gap-2">
                  {submitting && <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />}
                  {submitting ? 'Confirming…' : 'Schedule Event'}
                </button>
              </form>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">You are scheduled</h2>
              <p className="text-gray-500 mb-8 max-w-md">A calendar invitation has been sent to your email address.</p>
              <div className="w-full max-w-sm rounded-2xl border border-gray-200 overflow-hidden shadow-sm mb-8">
                <div className="h-2 bg-gradient-to-r from-indigo-500 to-violet-500" />
                <div className="p-6 text-left">
                  <h4 className="font-bold text-gray-900 text-lg mb-1">{eventType.name}</h4>
                  <p className="text-gray-500 text-sm mb-5">with {eventType.user?.name || 'Host'}</p>
                  <div className="flex items-start gap-3 text-gray-700">
                    <svg className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p className="font-semibold">{selectedTime} – {endTimeStr}</p>
                      <p className="text-gray-500 text-sm">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-gray-700 mt-3">
                    <svg className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <div>
                      <p className="font-semibold">{formData.name}</p>
                      <p className="text-gray-500 text-sm">{formData.email}</p>
                    </div>
                  </div>
                </div>
              </div>
              <a href={generateGoogleCalendarUrl()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Add to Google Calendar
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
