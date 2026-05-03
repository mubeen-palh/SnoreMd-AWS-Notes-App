import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NoteItem from './NoteItem';

vi.mock('../api', () => ({
  getAttachmentUrl: vi.fn()
}));

const baseNote = {
  noteId: 'n1',
  patientId: 'p1',
  content: 'Test content',
  authorId: 'user1',
  tags: ['mri', 'brain'],
  createdAt: '2026-05-02T08:08:02.383Z',
  version: 1
};

describe('NoteItem', () => {
  it('displays content, author, and tags', () => {
    render(<NoteItem note={baseNote} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Test content')).toBeInTheDocument();
    expect(screen.getByText('user1')).toBeInTheDocument();
    expect(screen.getByText('#mri')).toBeInTheDocument();
    expect(screen.getByText('#brain')).toBeInTheDocument();
  });

  it('fires onEdit and onDelete with the note', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<NoteItem note={baseNote} onEdit={onEdit} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledWith(baseNote);

    await user.click(screen.getByRole('button', { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith(baseNote);
  });

  it('shows attachment button only when attachmentKey is present', () => {
    const { rerender } = render(
      <NoteItem note={baseNote} onEdit={vi.fn()} onDelete={vi.fn()} />
    );
    expect(screen.queryByRole('button', { name: /view attachment/i })).not.toBeInTheDocument();

    rerender(
      <NoteItem
        note={{ ...baseNote, attachmentKey: 'attachments/abc.png' }}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /view attachment/i })).toBeInTheDocument();
  });
});
