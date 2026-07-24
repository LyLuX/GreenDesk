/**
 * Provides a consistent surface for status, error, and empty-state content.
 *
 * @param {object} props Component properties.
 * @param {React.ReactNode} props.children Content displayed in the panel.
 * @param {keyof JSX.IntrinsicElements} [props.as='section'] HTML element to render.
 * @returns {JSX.Element} The status panel.
 */
export default function StatusPanel({ as: Element = 'section', children }) {
  return <Element className="status-panel surface p-4 text-center">{children}</Element>;
}
