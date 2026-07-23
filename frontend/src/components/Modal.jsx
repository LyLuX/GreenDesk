export default function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 grid place-items-center bg-slate-900/40 p-4">
      <section className="w-full max-w-lg rounded bg-white p-5 shadow-xl">
        <div className="mb-4 flex justify-between">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose}>x</button>
        </div>
        {children}
      </section>
    </div>
  );
}
