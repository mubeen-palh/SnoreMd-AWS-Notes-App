import NoteItem from './NoteItem';

export default function NoteList({ patientId, notes, loading, onEdit, onDelete }) {
  return (
    <section className="notes-list" aria-label="Notes list">
      <h2>
        Notes for <code>{patientId}</code> ({notes.length})
      </h2>
      {loading && notes.length === 0 && <p className="muted">Loading…</p>}
      {!loading && notes.length === 0 && (
        <p className="muted">No notes match.</p>
      )}
      {notes.map(n => (
        <NoteItem key={n.noteId} note={n} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </section>
  );
}
