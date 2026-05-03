import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NoteForm from './NoteForm';

vi.mock('../api', () => ({
  uploadAttachment: vi.fn()
}));

describe('NoteForm', () => {
  it('disables submit when content is empty', () => {
    render(<NoteForm onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: /create note/i })).toBeDisabled();
  });

  it('submits parsed values', async () => {
    const onSubmit = vi.fn().mockResolvedValue();
    const user = userEvent.setup();
    render(<NoteForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/note content/i), 'Hello note');
    await user.type(screen.getByLabelText(/tags/i), 'mri, brain');
    await user.click(screen.getByRole('button', { name: /create note/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      content: 'Hello note',
      tags: ['mri', 'brain'],
      studyDate: undefined,
      attachmentKey: undefined
    });
  });

  it('shows "Update Note" and pre-fills when editing', () => {
    const editingNote = {
      noteId: 'n1',
      version: 2,
      content: 'Existing',
      tags: ['x'],
      studyDate: '2026-01-01'
    };
    render(<NoteForm editingNote={editingNote} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByRole('button', { name: /update note/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/note content/i)).toHaveValue('Existing');
    expect(screen.getByLabelText(/tags/i)).toHaveValue('x');
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });
});
