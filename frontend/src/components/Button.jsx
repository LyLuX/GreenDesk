export default function Button({ children, className = '', ...props }) {
  return (
    <button className={`btn btn-brand ${className}`} {...props}>
      {children}
    </button>
  );
}
