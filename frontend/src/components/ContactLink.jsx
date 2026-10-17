/** Open contact details with the device's default mail or phone application. */
export default function ContactLink({ value, type = 'email' }) {
  const text = String(value ?? '').trim();
  if (!text) return '—';

  const destination = type === 'phone' ? text.replace(/[\s().-]/g, '') : text;
  const encoded = encodeURIComponent(destination).replaceAll('%40', '@').replaceAll('%2B', '+');
  return <a href={`${type === 'phone' ? 'tel' : 'mailto'}:${encoded}`}>{text}</a>;
}
