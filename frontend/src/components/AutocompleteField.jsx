import { useId, useMemo, useState } from 'react';

const normalize = (value) => String(value).trim().toLocaleLowerCase('fr');
const defaultSuggestionLabel = (suggestion) => String(suggestion ?? '').trim();

/** Text field proposing existing values as the user types. */
export default function AutocompleteField({
  label,
  suggestions = [],
  defaultValue = '',
  value: controlledValue,
  getSuggestionLabel = defaultSuggestionLabel,
  getSuggestionKey,
  loading = false,
  emptyMessage = 'Aucune proposition',
  onChange,
  onSelect,
  ...inputProps
}) {
  const id = useId();
  const listboxId = `${id}-suggestions`;
  const [internalValue, setInternalValue] = useState(String(defaultValue));
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const value = controlledValue === undefined ? internalValue : String(controlledValue ?? '');

  const uniqueSuggestions = useMemo(() => {
    const suggestionsByNormalizedLabel = new Map();
    suggestions.forEach((suggestion) => {
      const label = getSuggestionLabel(suggestion);
      const normalized = normalize(label);
      if (normalized && !suggestionsByNormalizedLabel.has(normalized)) {
        suggestionsByNormalizedLabel.set(normalized, suggestion);
      }
    });
    return [...suggestionsByNormalizedLabel.values()].sort((left, right) =>
      getSuggestionLabel(left).localeCompare(getSuggestionLabel(right), 'fr'),
    );
  }, [getSuggestionLabel, suggestions]);

  const matches = useMemo(() => {
    const query = normalize(value);
    if (!query) return [];
    return uniqueSuggestions.filter((suggestion) =>
      normalize(getSuggestionLabel(suggestion)).includes(query),
    );
  }, [getSuggestionLabel, uniqueSuggestions, value]);

  const suggestionsVisible = open && Boolean(value.trim());
  const selectSuggestion = (suggestion) => {
    if (controlledValue === undefined) setInternalValue(getSuggestionLabel(suggestion));
    setOpen(false);
    setActiveIndex(-1);
    onSelect?.(suggestion);
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
            if (controlledValue === undefined) setInternalValue(event.target.value);
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
            {loading ? (
              <span className="autocomplete-empty list-group-item" role="status">
                Recherche…
              </span>
            ) : matches.length ? (
              matches.map((suggestion, index) => (
                <button
                  id={`${listboxId}-option-${index}`}
                  className={`autocomplete-option list-group-item list-group-item-action ${
                    activeIndex === index ? 'active' : ''
                  }`}
                  type="button"
                  role="option"
                  aria-selected={activeIndex === index}
                  key={getSuggestionKey?.(suggestion) ?? normalize(getSuggestionLabel(suggestion))}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    selectSuggestion(suggestion);
                  }}
                >
                  {getSuggestionLabel(suggestion)}
                </button>
              ))
            ) : (
              <span className="autocomplete-empty list-group-item" role="status">
                {emptyMessage}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
