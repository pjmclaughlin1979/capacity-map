import "./InfoModal.css";

export default function InfoModal({ title, isOpen, onClose, children }) {
  if (!isOpen) return null;

  return (
    <div className="info-modal__backdrop" role="presentation" onClick={onClose}>
      <div
        className="info-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="info-modal__header">
          <h2>{title}</h2>
          <button type="button" className="info-modal__close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </header>
        <div className="info-modal__body">{children}</div>
      </div>
    </div>
  );
}
