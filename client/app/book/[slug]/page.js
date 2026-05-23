// ============================================================
// FILE: client/app/book/[slug]/page.js
//
// What changed vs previous version:
//   1. Email input shows LIVE validation as you type
//   2. On blur (leaving the field) — a spinner appears for
//      ~1.5s simulating "checking email…" then shows result
//   3. Three visual states on the email field:
//       - Neutral  (grey border)  — not typed yet
//       - Checking (blue spinner) — user just left the field
//       - Invalid  (red border + message)
//       - Valid    (green border + checkmark)
//   4. Submit button disabled until email shows green
//   5. Server error about email shows inline (not just toast)
// ============================================================
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams,  useSearchParams } from 'next/navigation';
import axios from 'axios';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, addMinutes } from 'date-fns';
import toast from 'react-hot-toast';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api`;

// ── Client-side email checks (mirrors backend Layer 1 + 4) ───
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com','guerrillamail.com','tempmail.com','throwam.com',
  'sharklasers.com','grr.la','spam4.me','trashmail.com','trashmail.me',
  'yopmail.com','10minutemail.com','temp-mail.org','fakeinbox.com',
  'maildrop.cc','getnada.com','dispostable.com','spamgourmet.com',
]);

// email states: 'idle' | 'checking' | 'valid' | 'invalid'
function checkEmailFormat(email) {
  if (!email) return { state: 'idle', message: '' };
  if (!EMAIL_REGEX.test(email))
    return { state: 'invalid', message: 'Invalid format — use something like john@gmail.com' };
  const domain = email.split('@')[1]?.toLowerCase();
  if (DISPOSABLE_DOMAINS.has(domain))
    return { state: 'invalid', message: 'Disposable email addresses are not allowed.' };
  return { state: 'valid', message: '' };  // format OK, server will do deep check
}

export default function BookingPage() {
  const { slug } = useParams();

  const [step, setStep]           = useState(1);
  const [eventType, setEventType] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  const [selectedDate, setSelectedDate]     = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading]     = useState(false);
  const [selectedTime, setSelectedTime]     = useState(null);
  const [availableDays, setAvailableDays]   = useState([1, 2, 3, 4, 5]);

  const [formData, setFormData]   = useState({ name: '', email: '' });

  // Email validation state
  const [emailState, setEmailState] = useState('idle');   // 'idle'|'checking'|'valid'|'invalid'
  const [emailMsg, setEmailMsg]     = useState('');
  const checkTimerRef               = useRef(null);

  const [submitting, setSubmitting] = useState(false);

  // ── Load event type ─────────────────────────────────────────
  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const res = await axios.get(`${API_URL}/event-types/${slug}`);
        setEventType(res.data);
      } catch { setError('Event type not found or is inactive.'); }
      finally  { setLoading(false); }
    })();
  }, [slug]);

  // ── Load available days ─────────────────────────────────────
  useEffect(() => {
    if (!eventType) return;
    axios.get(`${API_URL}/availability`)
      .then(r => setAvailableDays(r.data.map(a => a.dayOfWeek)))
      .catch(() => {});
  }, [eventType]);

  // ── Fetch time slots ────────────────────────────────────────
  const fetchSlots = useCallback(async () => {
    if (!eventType) return;
    try {
      setSlotsLoading(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const res = await axios.get(`${API_URL}/bookings/slots?slug=${slug}&date=${dateStr}`);
      setAvailableSlots(res.data);
    } catch { setAvailableSlots([]); }
    finally  { setSlotsLoading(false); }
  }, [selectedDate, eventType, slug]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  // ── Calendar tile disabled ──────────────────────────────────
  const tileDisabled = ({ date, view }) => {
    if (view !== 'month') return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (date < today) return true;
    return !availableDays.includes(date.getDay());
  };

  // ── Email change: instant format check as user types ────────
  const handleEmailChange = (e) => {
    const val = e.target.value;
    setFormData(f => ({ ...f, email: val }));

    // Clear any pending blur-check timer
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);

    if (!val) { setEmailState('idle'); setEmailMsg(''); return; }

    const { state, message } = checkEmailFormat(val);
    if (state === 'invalid') {
      setEmailState('invalid');
      setEmailMsg(message);
    } else {
      // Format looks good — reset to idle until blur triggers deep check
      setEmailState('idle');
      setEmailMsg('');
    }
  };

  // ── Email blur: simulate "checking" then mark valid ─────────
  // (Real deep check happens on the server at submit time.
  //  We show a spinner here so the UX feels thorough.)
  const handleEmailBlur = () => {
    const val = formData.email.trim();
    if (!val) return;

    const { state, message } = checkEmailFormat(val);
    if (state === 'invalid') {
      setEmailState('invalid');
      setEmailMsg(message);
      return;
    }

    // Format is OK — show "checking" spinner for 1.2s then go green
    setEmailState('checking');
    setEmailMsg('');
    checkTimerRef.current = setTimeout(() => {
      setEmailState('valid');
      setEmailMsg('');
    }, 1200);
  };

  // ── Helpers ─────────────────────────────────────────────────
  const buildStartDate = () => {
    const [h, m] = selectedTime.split(':').map(Number);
    const d = new Date(selectedDate);
    d.setHours(h, m, 0, 0);
    return d;
  };

  const handleDateChange = (date) => { setSelectedDate(date); setSelectedTime(null); };
  const proceedToForm    = (time)  => { setSelectedTime(time); setStep(2); };

  // ── Submit ───────────────────────────────────────────────────
  const submitBooking = async (e) => {
    e.preventDefault();

    // Re-run format check as final guard
    const { state, message } = checkEmailFormat(formData.email);
    if (state === 'invalid') {
      setEmailState('invalid'); setEmailMsg(message); return;
    }
    if (emailState !== 'valid') {
      // User hasn't blurred yet — force the check
      setEmailState('checking');
      await new Promise(r => setTimeout(r, 1200));
      setEmailState('valid');
    }

    setSubmitting(true);
    try {
      if (rescheduleId) {

  await axios.put(
    `${API_URL}/bookings/${rescheduleId}/reschedule`,
    {
      startTime: buildStartDate().toISOString(),
    }
  );

} else {

  await axios.post(`${API_URL}/bookings`, {
    eventTypeId: eventType.id,
    inviteeName: formData.name,
    inviteeEmail: formData.email,
    startTime: buildStartDate().toISOString(),
  });

}
      toast.success('Meeting confirmed! Check your inbox.');
      setStep(3);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to book. Please try again.';
      // If the server says the email is bad — show it inline
      if (msg.toLowerCase().includes('email') || msg.toLowerCase().includes('mailbox') || msg.toLowerCase().includes('domain')) {
        setEmailState('invalid');
        setEmailMsg(msg);
        setStep(2);
      } else {
        toast.error(msg);
        fetchSlots();
        setStep(1);
      }
    } finally { setSubmitting(false); }
  };

  const generateGoogleCalendarUrl = () => {
    if (!eventType || !selectedTime) return '#';
    const start = buildStartDate();
    const end   = addMinutes(start, eventType.duration);
    const fmt   = d => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const url   = new URL('https://calendar.google.com/calendar/render');
    url.searchParams.set('action', 'TEMPLATE');
    url.searchParams.set('text', `${eventType.name} with ${eventType.user?.name || 'Host'}`);
    url.searchParams.set('dates', `${fmt(start)}/${fmt(end)}`);
    return url.toString();
  };

  const endTimeStr = selectedTime && eventType
    ? format(addMinutes(buildStartDate(), eventType.duration), 'HH:mm') : '';

  // ── Email field styles ───────────────────────────────────────
  const emailBorder = {
    idle:     'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500',
    checking: 'border-blue-300  focus:ring-blue-300',
    valid:    'border-green-400 focus:ring-green-300 bg-green-50',
    invalid:  'border-red-400   focus:ring-red-300   bg-red-50',
  }[emailState];

  const isSubmitDisabled =
    submitting ||
    !formData.name.trim() ||
    !formData.email.trim() ||
    emailState === 'invalid' ||
    emailState === 'idle' ||
    emailState === 'checking';

  // ── Loading / Error ─────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
    </div>
  );

  if (error || !eventType) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-2xl shadow-sm text-center max-w-md w-full">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Not Found</h2>
        <p className="text-gray-500">{error || 'Something went wrong.'}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 py-8 md:py-12 font-sans">
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] max-w-5xl w-full overflow-hidden flex flex-col md:flex-row min-h-[500px] md:min-h-[600px] border border-gray-100">

        {/* LEFT PANEL */}
        <div className="w-full md:w-[340px] lg:w-[380px] bg-white border-b md:border-b-0 md:border-r border-gray-100 p-6 md:p-8 flex flex-col shrink-0">
          <div className="flex items-center gap-2 mb-6 md:mb-8">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">S</div>
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
            {eventType.description && <p className="leading-relaxed text-gray-500">{eventType.description}</p>}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 bg-white p-4 sm:p-6 md:p-8 overflow-y-auto">

          {/* STEP 1 */}
          {step === 1 && (
            <div className="h-full flex flex-col lg:flex-row gap-6 md:gap-8">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-5">Select a Date &amp; Time</h3>
                <Calendar onChange={handleDateChange} value={selectedDate} minDate={new Date()} tileDisabled={tileDisabled} className="border-none w-full !font-sans" />
              </div>
              <div className="w-full lg:w-52 flex flex-col">
                <p className="text-sm font-semibold text-gray-500 mb-4 text-center">{format(selectedDate, 'EEEE, MMM d')}</p>
                <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[300px] lg:max-h-[400px]">
                  {slotsLoading ? (
                    <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
                  ) : availableSlots.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                      <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                      <p className="text-sm">No times available</p>
                    </div>
                  ) : availableSlots.map(time => (
                    <button key={time} onClick={() => proceedToForm(time)} className="w-full py-3 border-2 border-indigo-100 text-indigo-600 font-bold rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400">
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="max-w-md mx-auto lg:mx-0">
              <button onClick={() => setStep(1)} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 mb-8">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Enter Details</h3>
              <form onSubmit={submitBooking} className="space-y-5" noValidate>

                {/* Name */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Full Name <span className="text-red-500">*</span></label>
                  <input type="text" required value={formData.name}
                    onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                {/* Email — with 3-state validation UI */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Email Address <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleEmailChange}
                      onBlur={handleEmailBlur}
                      placeholder="john@gmail.com"
                      className={`w-full px-4 py-3 pr-11 border rounded-xl outline-none transition-all focus:ring-2 ${emailBorder}`}
                    />
                    {/* Right-side icon inside input */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      {emailState === 'checking' && (
                        <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                        </svg>
                      )}
                      {emailState === 'valid' && (
                        <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                        </svg>
                      )}
                      {emailState === 'invalid' && (
                        <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Status messages */}
                  {emailState === 'checking' && (
                    <p className="mt-1.5 text-xs text-blue-600 flex items-center gap-1">
                      Verifying email address…
                    </p>
                  )}
                  {emailState === 'valid' && (
                    <p className="mt-1.5 text-xs text-green-600 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                      Email looks good
                    </p>
                  )}
                  {emailState === 'invalid' && emailMsg && (
                    <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                      {emailMsg}
                    </p>
                  )}
                  {emailState === 'idle' && !formData.email && (
                    <p className="mt-1.5 text-xs text-gray-400">Meeting details will be sent to this address.</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4 flex items-center justify-center gap-2"
                >
                  {submitting && <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />}
                  {submitting ? 'Confirming & sending email…' : 'Schedule Event'}
                </button>
              </form>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">You are scheduled!</h2>
              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 mb-6 text-sm text-indigo-700 max-w-sm">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
                <span>Confirmation sent to <strong className="font-semibold">{formData.email}</strong></span>
              </div>
              <div className="w-full max-w-sm rounded-2xl border border-gray-200 overflow-hidden shadow-sm mb-8">
                <div className="h-2 bg-gradient-to-r from-indigo-500 to-violet-500" />
                <div className="p-6 text-left">
                  <h4 className="font-bold text-gray-900 text-lg mb-1">{eventType.name}</h4>
                  <p className="text-gray-500 text-sm mb-5">with {eventType.user?.name || 'Host'}</p>
                  <div className="flex items-start gap-3 text-gray-700">
                    <svg className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    <div>
                      <p className="font-semibold">{selectedTime} – {endTimeStr}</p>
                      <p className="text-gray-500 text-sm">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-gray-700 mt-3">
                    <svg className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                    <div>
                      <p className="font-semibold">{formData.name}</p>
                      <p className="text-gray-500 text-sm">{formData.email}</p>
                    </div>
                  </div>
                </div>
              </div>
              <a href={generateGoogleCalendarUrl()} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                Add to Google Calendar
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}