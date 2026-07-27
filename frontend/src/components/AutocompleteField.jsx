import { useId, useMemo, useState } from 'react';

const normalize = (value) => String(value).trim().toLocaleLowerCase('fr');

/** Text field proposing existing values as the user types. */
export default function AutocompleteField({
  label,
  suggestions = [],
  defaultValue = '',
  onChange,
  ...inputProps
}) {
  const id = useId();
  const listboxId = `${id}-suggestions`;
  const [value, setValue] = useState(String(defaultValue));
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const uniqueSuggestions = useMemo(() => {
    const valuesByNormalizedName = new Map();
    suggestions.forEach((suggestion) => {
      const text = String(suggestion ?? '').trim();
      const normalized = normalize(text);
      if (normalized && !valuesByNormalizedName.has(normalized)) {
        valuesByNormalizedName.set(normalized, text);
      }
    });
    return [...valuesByNormalizedName.values()].sort((left, right) =>
      left.localeCompare(right, 'fr'),
    );
  }, [suggestions]);

  const matches = useMemo(() => {
    const query = normalize(value);
    if (!query) return [];
    return uniqueSuggestions.filter((suggestion) => normalize(suggestion).includes(query));
  }, [uniqueSuggestions, value]);

  const suggestionsVisible = open && Boolean(value.trim());
  const selectSuggestion = (suggestion) => {
    setValue(suggestion);
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event) => {
    if (!suggestionsVisible || !matches.length) {
      if (event.key === 'Escape') setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % matches.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? matches.length - 1 : current - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      selectSuggestion(matches[activeIndex]);
    } else if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className="form-label mb-0 text-body-secondary">
      <label htmlFor={id}>{label}</label>
      <div className="position-relative">
        <input
          {...inputProps}
          id={id}
          className="autocomplete-input form-control"
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={suggestionsVisible}
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          value={value}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setOpen(false);
            setActiveIndex(-1);
          }}
          onChange={(event) => {
            setValue(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
            onChange?.(event);
          }}
          onKeyDown={handleKeyDown}
        />
        {suggestionsVisible && (
          <div
            id={listboxId}
            className="autocomplete-options list-group position-absolute start-0 end-0"
            role="listbox"
          >
            {matches.length ? (
              matches.map((suggestion, index) => (
                <button
                  id={`${listboxId}-option-${index}`}
                  className={`autocomplete-option list-group-item list-group-item-action ${
                    activeIndex === index ? 'active' : ''
                  }`}
                  type="button"
                  role="option"
                  aria-selected={activeIndex === index}
                  key={normalize(suggestion)}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    selectSuggestion(suggestion);
                  }}
                >
                  {suggestion}
                </button>
              ))
            ) : (
              <span className="autocomplete-empty list-group-item" role="status">
                Aucune proposition
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
