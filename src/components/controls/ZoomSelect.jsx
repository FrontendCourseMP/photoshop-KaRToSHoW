import { useState } from 'react';
import { MIN_ZOOM, MAX_ZOOM, ZOOM_PRESETS, clamp } from '../../utils/zoom';

export default function ZoomSelect({ zoom, onChange }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState('');

  function commit(raw) {
    const n = parseFloat(raw);
    if (!isNaN(n) && n > 0) onChange(clamp(n / 100, MIN_ZOOM, MAX_ZOOM));
    setEditing(false);
  }

  if (editing) {
    return (
      <input className="zoom-input" value={val} autoFocus
        onChange={e => setVal(e.target.value)}
        onBlur={() => commit(val)}
        onKeyDown={e => {
          if (e.key === 'Enter') commit(val);
          if (e.key === 'Escape') setEditing(false);
        }}
      />
    );
  }

  const currentPercent = `${Math.round(zoom * 100)}%`;
  const selectedPreset = ZOOM_PRESETS.find(p => p.v === zoom);
  const selectValue = selectedPreset ? selectedPreset.v : '';

  return (
    <div className="zoom-select">
      <span className="zoom-select__display" onClick={() => { setVal(String(Math.round(zoom * 100))); setEditing(true); }}>
        {currentPercent}
      </span>
      <select
        className="zoom-select__arrow"
        value={selectValue}
        onChange={e => onChange(parseFloat(e.target.value))}
      >
        <option value="" disabled>·</option>
        {ZOOM_PRESETS.map(p => (
          <option key={p.v} value={p.v}>{p.label}</option>
        ))}
      </select>
    </div>
  );
}
