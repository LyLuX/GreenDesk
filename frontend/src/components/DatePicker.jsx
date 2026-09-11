import { useId, useLayoutEffect, useRef, useState } from 'react';
import calendarPosition from '../utils/calendar-position.js';

const toIso = (date) =>
  `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const parseDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) || toIso(date) !== value ? null : date;
};
const months = Array.from({ length: 12 }, (_, month) =>
  new Date(2024, month, 1).toLocaleDateString('fr-FR', { month: 'long' }),
);

/** Floating calendar with native date validation and viewport-aware placement. */
export default function DatePicker({ label = 'Date', onChange, ...props }) {
  const calendarId = useId();
  const inputRef = useRef(null);
  const triggerRef = useRef(null);
  const calendarRef = useRef(null);
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(props.value ?? props.defaultValue ?? '');
  const [cursor, setCursor] = useState(() => parseDate(selected) ?? new Date());
  useLayoutEffect(() => {
    if (!open) return undefined;
    const calendar = calendarRef.current;
    // A top-layer popover escapes modal overflow without changing form layout or DOM focus order.
    calendar.showPopover?.();
    // A constructed stylesheet keeps positioning compatible with the application's strict CSP.
    const sheet = new CSSStyleSheet();
    document.adoptedStyleSheets = [...(document.adoptedStyleSheets ?? []), sheet];
    const position = () => {
      const viewport = window.visualViewport ?? {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
      };
      const bounds = calendar.getBoundingClientRect();
      const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const placement = calendarPosition(
        inputRef.current.getBoundingClientRect(),
        {
          width: Math.min(24 * rem, Math.max(0, viewport.width - 16)),
          height: Math.max(bounds.height, calendar.scrollHeight),
        },
        viewport,
      );
      if (sheet.cssRules.length) sheet.deleteRule(0);
      sheet.insertRule(`[id=${JSON.stringify(calendarId)}] {
        left: ${placement.left}px; top: ${placement.top}px;
        width: ${placement.width}px; max-height: ${placement.maxHeight}px;
      }`);
    };
    position();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(position);
    observer?.observe(calendar);
    observer?.observe(inputRef.current);
    const dismiss = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss, true);
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    window.visualViewport?.addEventListener('resize', position);
    window.visualViewport?.addEventListener('scroll', position);
    return () => {
      observer?.disconnect();
      calendar.hidePopover?.();
      document.adoptedStyleSheets = document.adoptedStyleSheets.filter((item) => item !== sheet);
      document.removeEventListener('pointerdown', dismiss, true);
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
      window.visualViewport?.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('scroll', position);
    };
  }, [open, calendarId]);
  const value = props.value ?? selected;
  const today = toIso(new Date());
  const allowed = (iso) => (!props.min || iso >= props.min) && (!props.max || iso <= props.max);
  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };
  const choose = (iso) => {
    if (iso && !allowed(iso)) return;
    const input = inputRef.current;
    // Use the native input event so controlled fields and form serialization share one value.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, iso);
    input.dispatchEvent(new Event('change', { bubbles: true }));
    close();
  };
  const move = (date, focus = false) => {
    const iso = toIso(date);
    if (!allowed(iso)) return;
    setCursor(date);
    if (focus)
      requestAnimationFrame(() =>
        calendarRef.current?.querySelector(`[data-date="${iso}"]`)?.focus(),
      );
  };
  const monthIsAllowed = (offset) => {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + offset, 1, 12);
    const last = new Date(next.getFullYear(), next.getMonth() + 1, 0, 12);
    return !((props.min && toIso(last) < props.min) || (props.max && toIso(next) > props.max));
  };
  const moveMonth = (offset) => {
    if (!monthIsAllowed(offset)) return;
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + offset, 1, 12);
    move(parseDate(props.min) && toIso(next) < props.min ? parseDate(props.min) : next);
  };
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1, 12);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const minYear = parseDate(props.min)?.getFullYear() ?? 1900;
  const maxYear =
    parseDate(props.max)?.getFullYear() ??
    Math.max(new Date().getFullYear() + 100, cursor.getFullYear());

  return (
    <div
      ref={rootRef}
      className="date-picker"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (open && event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
      }}
    >
      <div className="date-picker-control">
        <input
          {...props}
          ref={inputRef}
          type="date"
          onChange={(event) => {
            setSelected(event.target.value);
            const date = parseDate(event.target.value);
            if (date) setCursor(date);
            onChange?.(event);
          }}
        />
        <button
          ref={triggerRef}
          type="button"
          className="date-picker-trigger"
          aria-label={`Calendrier : ${label}`}
          aria-expanded={open}
          aria-controls={calendarId}
          disabled={props.disabled || props.readOnly}
          onClick={() => {
            if (!open) {
              const current = parseDate(inputRef.current.value) ?? new Date();
              const iso = toIso(current);
              setCursor(
                parseDate(
                  props.min && iso < props.min
                    ? props.min
                    : props.max && iso > props.max
                      ? props.max
                      : iso,
                ),
              );
            }
            setOpen(!open);
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <rect x="3" y="5" width="18" height="16" rx="3" />
            <path d="M7 3v4m10-4v4M3 11h18m-14 4h3m4 0h3m-10 3h3" />
          </svg>
        </button>
      </div>
      {open && (
        <section
          ref={calendarRef}
          popover="manual"
          id={calendarId}
          className="date-picker-calendar"
          aria-label={`Choisir une date : ${label}`}
        >
          <div className="date-picker-heading">
            <button
              type="button"
              className="btn btn-outline-brand"
              aria-label="Mois précédent"
              disabled={!monthIsAllowed(-1)}
              onClick={() => moveMonth(-1)}
            >
              ‹
            </button>
            <select
              className="form-select"
              aria-label="Mois"
              value={cursor.getMonth()}
              onChange={(event) => moveMonth(Number(event.target.value) - cursor.getMonth())}
            >
              {months.map((month, index) => (
                <option
                  key={month}
                  value={index}
                  disabled={!monthIsAllowed(index - cursor.getMonth())}
                >
                  {month}
                </option>
              ))}
            </select>
            <select
              className="form-select"
              aria-label="Année"
              value={cursor.getFullYear()}
              onChange={(event) =>
                moveMonth((Number(event.target.value) - cursor.getFullYear()) * 12)
              }
            >
              {Array.from(
                { length: Math.max(0, maxYear - Math.min(minYear, cursor.getFullYear()) + 1) },
                (_, index) => Math.min(minYear, cursor.getFullYear()) + index,
              ).map((year) => (
                <option key={year}>{year}</option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-outline-brand"
              aria-label="Mois suivant"
              disabled={!monthIsAllowed(1)}
              onClick={() => moveMonth(1)}
            >
              ›
            </button>
          </div>
          <p className="visually-hidden" aria-live="polite">
            {cursor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </p>
          <div className="date-picker-grid">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
              <span className="date-picker-weekday" key={day}>
                {day}
              </span>
            ))}
            {Array.from({ length: offset }, (_, index) => (
              <span key={`empty-${index}`} />
            ))}
            {Array.from({ length: days }, (_, index) => {
              const date = new Date(cursor.getFullYear(), cursor.getMonth(), index + 1, 12);
              const iso = toIso(date);
              return (
                <button
                  key={iso}
                  type="button"
                  data-date={iso}
                  className={`date-picker-day ${iso === value ? 'is-selected' : ''}`}
                  disabled={!allowed(iso)}
                  aria-pressed={iso === value}
                  aria-current={iso === today ? 'date' : undefined}
                  aria-label={date.toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                  tabIndex={date.getDate() === cursor.getDate() ? 0 : -1}
                  onFocus={() => setCursor(date)}
                  onClick={() => choose(iso)}
                  onKeyDown={(event) => {
                    const shifts = {
                      ArrowLeft: -1,
                      ArrowRight: 1,
                      ArrowUp: -7,
                      ArrowDown: 7,
                      Home: -((date.getDay() + 6) % 7),
                      End: 6 - ((date.getDay() + 6) % 7),
                    };
                    if (event.key in shifts) {
                      event.preventDefault();
                      move(
                        new Date(
                          date.getFullYear(),
                          date.getMonth(),
                          date.getDate() + shifts[event.key],
                          12,
                        ),
                        true,
                      );
                    }
                  }}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
          <div className="date-picker-actions">
            <button
              type="button"
              className="btn btn-outline-brand btn-sm"
              disabled={!allowed(today)}
              onClick={() => choose(today)}
            >
              Aujourd’hui
            </button>
            {!props.required && (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => choose('')}
              >
                Effacer
              </button>
            )}
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm ms-auto"
              onClick={close}
            >
              Fermer
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
