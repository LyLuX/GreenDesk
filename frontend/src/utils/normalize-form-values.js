/** Normalizes configured form fields before sending a JSON API payload. */
export default function normalizeFormValues(values, fields) {
  const fieldByName = new Map(fields.map((field) => [field.name, field]));
  return Object.entries(values).reduce((payload, [name, rawValue]) => {
    const field = fieldByName.get(name);
    const value = typeof rawValue === 'string' ? rawValue.trim() : rawValue;
    if (value === '') {
      if (!field?.required) payload[name] = null;
      return payload;
    }
    if (field?.valueType === 'number') {
      const number = Number(value);
      if (!Number.isFinite(number)) throw new Error(`${field.label} doit être un nombre valide.`);
      payload[name] = number;
      return payload;
    }
    payload[name] = value;
    return payload;
  }, {});
}
