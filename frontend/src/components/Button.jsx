const variantClasses = {
  primary: 'btn-brand',
  view: 'btn-outline-brand-blue',
  edit: 'btn-outline-edit',
  danger: 'btn-outline-danger',
  secondary: 'btn-outline-secondary',
  restore: 'btn-outline-brand',
};

export default function Button({ children, variant = 'primary', className = '', ...props }) {
  return (
    <button
      className={`btn ${variantClasses[variant] ?? variantClasses.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
