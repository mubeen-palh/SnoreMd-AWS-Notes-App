import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Filters from './Filters';

const empty = { q: '', tag: '', from: '', to: '' };

describe('Filters', () => {
  it('renders all four filter inputs', () => {
    render(<Filters value={empty} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/search content/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filter by tag/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/from date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/to date/i)).toBeInTheDocument();
  });

  it('debounces and calls onChange with new search value', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Filters value={empty} onChange={onChange} />);

    await user.type(screen.getByLabelText(/search content/i), 'mri');

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'mri' })
      );
    });
  });

  it('shows Clear filters only when something is set', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<Filters value={empty} onChange={onChange} />);

    expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/filter by tag/i), 'mri');
    rerender(<Filters value={empty} onChange={onChange} />);

    expect(await screen.findByRole('button', { name: /clear filters/i })).toBeInTheDocument();
  });
});
