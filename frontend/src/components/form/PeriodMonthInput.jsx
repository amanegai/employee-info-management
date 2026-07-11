import { useEffect, useRef, useState } from 'react';
import {
  monthToPeriodLabel,
  periodLabelToMonth,
  periodLabelToSlashDisplay,
  slashDisplayToPeriodLabel,
} from '../../utils';

export default function PeriodMonthInput({ id, value, onChange }) {
  const pickerRef = useRef(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    setDraft('');
  }, [value]);

  const display = draft !== '' ? draft : periodLabelToSlashDisplay(value);

  function commit(raw) {
    const label = slashDisplayToPeriodLabel(raw);
    if (raw.trim() === '') {
      onChange('');
    } else if (label) {
      onChange(label);
    }
    setDraft('');
  }

  function openPicker() {
    pickerRef.current?.showPicker?.();
  }

  return (
    <div className="period-month-field">
      <input
        id={id}
        type="text"
        className="form-control"
        placeholder="年/月"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit(e.target.value);
          }
        }}
      />
      <input
        ref={pickerRef}
        type="month"
        className="period-month-picker"
        tabIndex={-1}
        aria-hidden="true"
        value={periodLabelToMonth(value)}
        onChange={(e) => onChange(monthToPeriodLabel(e.target.value))}
      />
      <button
        type="button"
        className="period-month-picker-btn"
        aria-label="年月を選択"
        onClick={openPicker}
      >
        <i className="bi bi-calendar3" aria-hidden="true" />
      </button>
    </div>
  );
}
