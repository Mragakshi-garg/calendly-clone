"use client";

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = `${process.env.NEXT_PUBLIC_API_URL}/api/event-types`;

const COLORS = ['#0069ff','#e5383b','#ff6d00','#2ec4b6','#9b5de5','#f72585','#4cc9f0'];

export default function EventTypesPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);          // null | 'create' | 'edit'
  const [form, setForm] = useState({ id:'', name:'', duration:30, slug:'', description:'' });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);     // event id
  const menuRef = useRef(null);

  useEffect(() => { load(); }, []);

  // close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(null); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function load() {
    try { setLoading(true); const r = await axios.get(API); setEvents(r.data); }
    catch { toast.error('Failed to load event types'); }
    finally { setLoading(false); }
  }

  function openCreate() {
    setForm({ id:'', name:'', duration:30, slug:'', description:'' });
    setModal('create');
  }
  function openEdit(ev) {
    setForm({ id:ev.id, name:ev.name, duration:ev.duration, slug:ev.slug, description:ev.description||'' });
    setModal('edit');
    setMenuOpen(null);
  }
  function onNameChange(e) {
    const name = e.target.value;
    const slug = modal === 'create'
      ? name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)+/g,'')
      : form.slug;
    setForm(f => ({...f, name, slug}));
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal === 'create') {
        await axios.post(API, form);
        toast.success('Event type created');
      } else {
        await axios.put(`${API}/${form.id}`, form);
        toast.success('Event type updated');
      }
      setModal(null); load();
    } catch(err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  }

  async function toggleActive(ev) {
    try {
      await axios.put(`${API}/${ev.id}`, { isActive: !ev.isActive });
      load();
    } catch { toast.error('Failed to update'); }
  }

  async function confirmDelete() {
    try {
      await axios.delete(`${API}/${deleteTarget.id}`);
      toast.success('Deleted');
      setDeleteTarget(null); load();
    } catch { toast.error('Failed to delete'); }
  }

  function copyLink(slug) {
    navigator.clipboard.writeText(`${window.location.origin}/book/${slug}`);
    toast.success('Link copied!');
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Event Types</h1>
        <button onClick={openCreate} className="bg-[#0069ff] hover:bg-[#0054cc] text-white text-sm font-semibold px-4 py-2.5 rounded-full flex items-center gap-1.5 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
          New Event Type
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-2 border-[#0069ff] border-t-transparent rounded-full"/></div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-16 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#0069ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No event types yet</h3>
          <p className="text-gray-500 text-sm mb-4">Create your first event type to start scheduling</p>
          <button onClick={openCreate} className="text-[#0069ff] text-sm font-semibold hover:underline">+ Create Event Type</button>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((ev, idx) => (
            <div key={ev.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-sm transition-shadow">
              {/* Color bar on top */}
              <div className="h-1.5" style={{ background: COLORS[idx % COLORS.length] }} />
              <div className="p-5 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-base font-semibold text-gray-900">{ev.name}</h3>
                    {!ev.isActive && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>}
                  </div>
                  <p className="text-sm text-gray-500 mb-3">{ev.duration} min</p>
                  <div className="flex items-center gap-4">
                    <button onClick={() => copyLink(ev.slug)} className="text-[#0069ff] text-sm font-medium hover:underline flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                      Copy link
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {/* Toggle */}
                  <button onClick={() => toggleActive(ev)} className={`relative w-10 h-6 rounded-full transition-colors ${ev.isActive ? 'bg-[#0069ff]' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${ev.isActive ? 'left-[18px]' : 'left-0.5'}`}/>
                  </button>
                  {/* 3-dot menu */}
                  <div className="relative" ref={menuOpen === ev.id ? menuRef : null}>
                    <button onClick={() => setMenuOpen(menuOpen === ev.id ? null : ev.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z"/></svg>
                    </button>
                    {menuOpen === ev.id && (
                      <div className="absolute right-0 top-10 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                        <button onClick={() => openEdit(ev)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Edit</button>
                        <button onClick={() => { setDeleteTarget(ev); setMenuOpen(null); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{modal === 'create' ? 'New Event Type' : 'Edit Event Type'}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event name</label>
                <input type="text" required value={form.name} onChange={onNameChange} placeholder="e.g. 30 Minute Meeting" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0069ff] focus:border-transparent"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                <select value={form.duration} onChange={e => setForm(f=>({...f, duration:+e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0069ff] focus:border-transparent bg-white">
                  <option value={15}>15 min</option><option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>60 min</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL slug</label>
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#0069ff]">
                  <span className="px-3 py-2 bg-gray-50 text-gray-400 text-sm border-r border-gray-300">/book/</span>
                  <input type="text" required value={form.slug} onChange={e => setForm(f=>({...f, slug:e.target.value}))} className="flex-1 px-3 py-2 text-sm focus:outline-none"/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400">(optional)</span></label>
                <textarea value={form.description} onChange={e => setForm(f=>({...f, description:e.target.value}))} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0069ff] focus:border-transparent resize-none"/>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-semibold bg-[#0069ff] text-white rounded-full hover:bg-[#0054cc] disabled:opacity-50 transition-colors flex items-center gap-2">
                  {saving && <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"/>}
                  {saving ? 'Saving…' : modal === 'create' ? 'Create' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-xl p-6 text-center">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Delete event type?</h3>
            <p className="text-sm text-gray-500 mb-5">This will permanently delete &quot;{deleteTarget.name}&quot; and cannot be undone.</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={confirmDelete} className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
