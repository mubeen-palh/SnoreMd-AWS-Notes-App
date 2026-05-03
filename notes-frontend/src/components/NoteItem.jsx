import { useState } from 'react';
import { getAttachmentUrl } from '../api';

export default function NoteItem({ note, onEdit, onDelete }) {
  const [resolvingAttachment, setResolvingAttachment] = useState(false);

  async function openAttachment() {
    if (!note.attachmentKey) return;
    setResolvingAttachment(true);
    try {
      const data = await getAttachmentUrl(note.attachmentKey);
      window.open(data.url, '_blank', 'noopener');
    } catch (e) {
      alert(`Could not open attachment: ${e.message}`);
    } finally {
      setResolvingAttachment(false);
    }
  }

  return (
    <article className="card note-card" data-testid="note-item">
      <div className="note-content">{note.content}</div>

      <div className="note-meta">
        <div className="meta-left">
          <span className="author">{note.authorId || 'unknown'}</span>
          {note.tags?.length > 0 && (
            <span className="tags">
              {note.tags.map(t => (
                <span key={t} className="tag">#{t}</span>
              ))}
            </span>
          )}
        </div>
        <span className="date">
          {note.createdAt ? new Date(note.createdAt).toLocaleString() : ''}
        </span>
      </div>

      {note.attachmentKey && (
        <div className="attachment">
          <button
            type="button"
            className="link-btn"
            onClick={openAttachment}
            disabled={resolvingAttachment}
          >
            {resolvingAttachment ? 'Opening…' : '📎 View attachment'}
          </button>
        </div>
      )}

      <div className="note-actions">
        <button
          type="button"
          className="secondary small"
          onClick={() => onEdit(note)}
        >
          Edit
        </button>
        <button
          type="button"
          className="danger small"
          onClick={() => onDelete(note)}
        >
          Delete
        </button>
      </div>
    </article>
  );
}
