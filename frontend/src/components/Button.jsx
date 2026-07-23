export default function Button({ children, className = '', ...props }) {
  return (
    <button
      className={`rounded bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
