const paths = {
  leaf: 'M20 4C10 2 3 7 5 14c2 6 12 7 15-10ZM5 20l10-10',
  dashboard: 'M3 3h7v7H3zM14 3h7v11h-7zM3 14h7v7H3zM14 18h7v3h-7z',
  relations: 'M9 6h6M6 9v6m12-6v6M9 18h6M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h6v6h-6z',
  fleet: 'M3 7l9-4 9 4v10l-9 4-9-4ZM3 7l9 4 9-4M12 11v10',
  maintenance: 'M14 6a5 5 0 0 0-6 6L3 17l4 4 5-5a5 5 0 0 0 6-6l-3 3-4-4 3-3Z',
  history: 'M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v5l3 2',
  administration: 'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6ZM9 12l2 2 4-4',
  menu: 'M4 6h16M4 12h16M4 18h16',
  logout: 'M9 4H4v16h5M13 8l4 4-4 4M8 12h13',
  empty: 'M3 7l9-4 9 4v13H3ZM3 7l9 4 9-4M12 11v4',
};

export default function Icon({ name, className = '' }) {
  return (
    <svg
      className={`ui-icon ${className}`.trim()}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name] ?? paths.fleet} />
    </svg>
  );
}
