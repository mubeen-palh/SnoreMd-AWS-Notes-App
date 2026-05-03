import { useState, useEffect } from 'react';

export default function Filters({ value, onChange }) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => {
      if (
        local.q !== value.q ||
        local.tag !== value.tag ||
        local.from !== value.from ||
        local.to !== value.to
      ) {
        onChange(local);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [local, value, onChange]);

  function set(k, v) {
    setLocal(prev => ({ ...prev, [k]: v }));
  }

  function clearAll() {
    const empty = { q: '', tag: '', from: '', to: '' };
    setLocal(empty);
    onChange(empty);
  }

  const hasFilters = local.q || local.tag || local.from || local.to;

  return (
    <div className="card filters" aria-label="Filters">
      <h2>Filters</h2>
      <div className="filters-grid">
        <input
          aria-label="Search content"
          placeholder="Search content…"
          value={local.q}
          onChange={e => set('q', e.target.value)}
        />
        <input
          aria-label="Filter by tag"
          placeholder="Tag"
          value={local.tag}
          onChange={e => set('tag', e.target.value)}
        />
        <input
          aria-label="From date"
          type="date"
          value={local.from}
          onChange={e => set('from', e.target.value)}
        />
        <input
          aria-label="To date"
          type="date"
          value={local.to}
          onChange={e => set('to', e.target.value)}
        />
      </div>
      {hasFilters && (
        <button type="button" className="link-btn" onClick={clearAll}>
          Clear filters
        </button>
      )}
    </div>
  );
}
