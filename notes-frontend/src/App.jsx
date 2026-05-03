import { useState, useEffect, useCallback } from 'react';
import {
  listNotes,
  createNote,
  updateNote,
  deleteNote
} from './api';
import NoteForm from './components/NoteForm';
import NoteList from './components/NoteList';
import Filters from './components/Filters';

const PAGE_SIZE = 5;
const FILTER_PAGE_SIZE = 50;

function hasActiveFilters(f) {
  return Boolean(f.q || f.tag || f.from || f.to);
}

export default function App() {
  const [patientId, setPatientId] = useState('p1');
  const [notes, setNotes] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [editingNote, setEditingNote] = useState(null);

  const [filters, setFilters] = useState({ q: '', tag: '', from: '', to: '' });

  const fetchPage = useCallback(
    async (pid, filtersArg, append = false, cursorArg = null) => {
      const setBusy = append ? setLoadingMore : setLoading;
      setBusy(true);
      setError(null);
      try {
        const params = {
          ...filtersArg,
          limit: hasActiveFilters(filtersArg) ? FILTER_PAGE_SIZE : PAGE_SIZE
        };
        if (cursorArg) params.cursor = cursorArg;
        const data = await listNotes(pid, params);
        setNotes(prev => (append ? [...prev, ...(data?.items || [])] : data?.items || []));
        setCursor(data?.nextCursor || null);
      } catch (e) {
        setError(e.message);
        if (!append) setNotes([]);
      } finally {
        setBusy(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchPage(patientId, filters, false, null);
  }, [patientId, filters, fetchPage]);

  function reload() {
    fetchPage(patientId, filters, false, null);
  }

  function loadMore() {
    if (cursor) fetchPage(patientId, filters, true, cursor);
  }

  async function handleSubmit(values) {
    setError(null);
    try {
      if (editingNote) {
        await updateNote(patientId, editingNote.noteId, editingNote.version, values);
        setEditingNote(null);
      } else {
        await createNote(patientId, values);
      }
      reload();
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }

  async function handleDelete(note) {
    if (!confirm(`Delete note "${note.content?.slice(0, 40)}…"?`)) return;
    setError(null);
    try {
      await deleteNote(patientId, note.noteId);
      reload();
    } catch (e) {
      setError(e.message);
    }
  }

  function handleEdit(note) {
    setEditingNote(note);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingNote(null);
  }

  return (
    <div className="container">
      <header>
        <h1>Notes</h1>
        <div className="patient-row">
          <label htmlFor="pid">Patient ID</label>
          <input
            id="pid"
            value={patientId}
            onChange={e => setPatientId(e.target.value)}
            placeholder="p1"
          />
          <button onClick={reload} disabled={loading}>
            {loading ? 'Loading…' : 'Reload'}
          </button>
        </div>
      </header>

      <NoteForm
        key={editingNote ? editingNote.noteId : 'new'}
        editingNote={editingNote}
        onSubmit={handleSubmit}
        onCancel={editingNote ? cancelEdit : undefined}
      />

      <Filters value={filters} onChange={setFilters} />

      {error && <div className="error" role="alert">{error}</div>}

      <NoteList
        patientId={patientId}
        notes={notes}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {cursor && (
        <div className="load-more">
          <button onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
