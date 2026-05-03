import { useState, useEffect } from 'react';
import { uploadAttachment } from '../api';

export default function NoteForm({ editingNote, onSubmit, onCancel }) {
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [studyDate, setStudyDate] = useState('');
  const [attachmentKey, setAttachmentKey] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState(null);

  useEffect(() => {
    if (editingNote) {
      setContent(editingNote.content || '');
      setTags((editingNote.tags || []).join(', '));
      setStudyDate(editingNote.studyDate || '');
      setAttachmentKey(editingNote.attachmentKey || '');
      setAttachmentName(editingNote.attachmentKey ? 'Existing attachment' : '');
    } else {
      setContent('');
      setTags('');
      setStudyDate('');
      setAttachmentKey('');
      setAttachmentName('');
    }
    setLocalError(null);
  }, [editingNote]);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setLocalError(null);
    try {
      const key = await uploadAttachment(file);
      setAttachmentKey(key);
      setAttachmentName(file.name);
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setUploading(false);
    }
  }

  function clearAttachment() {
    setAttachmentKey('');
    setAttachmentName('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setLocalError(null);
    try {
      await onSubmit({
        content: content.trim(),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        studyDate: studyDate || undefined,
        attachmentKey: attachmentKey || undefined
      });
      if (!editingNote) {
        setContent('');
        setTags('');
        setStudyDate('');
        setAttachmentKey('');
        setAttachmentName('');
      }
    } catch {
      // parent handles error display
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card create-form" aria-label="Note form">
      <h2>{editingNote ? 'Edit Note' : 'Add Note'}</h2>

      <textarea
        aria-label="Note content"
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Note content…"
        rows={3}
        required
      />

      <div className="row">
        <input
          aria-label="Tags"
          value={tags}
          onChange={e => setTags(e.target.value)}
          placeholder="Tags (comma separated)"
        />
        <input
          aria-label="Study date"
          type="date"
          value={studyDate}
          onChange={e => setStudyDate(e.target.value)}
        />
      </div>

      <div className="attachment-row">
        <label className="file-label">
          {uploading ? 'Uploading…' : 'Attach file'}
          <input
            type="file"
            onChange={handleFile}
            disabled={uploading}
            data-testid="file-input"
          />
        </label>
        {attachmentName && (
          <span className="attachment-info">
            {attachmentName}
            <button
              type="button"
              className="link-btn"
              onClick={clearAttachment}
              aria-label="Remove attachment"
            >
              ×
            </button>
          </span>
        )}
      </div>

      {localError && <div className="error">{localError}</div>}

      <div className="form-actions">
        <button type="submit" disabled={submitting || uploading || !content.trim()}>
          {submitting ? 'Saving…' : editingNote ? 'Update Note' : 'Create Note'}
        </button>
        {onCancel && (
          <button type="button" className="secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
