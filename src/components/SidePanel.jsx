import "./SidePanel.css";

export default function SidePanel({ title, html, onClose }) {
  if (!html) return null;

  return (
    <div className="side-panel" role="dialog" aria-modal="false" aria-label={title}>
      <header className="side-panel__header">
        <h2>{title}</h2>
        <button type="button" className="side-panel__close" onClick={onClose} aria-label="Close">
          &times;
        </button>
      </header>
      <div className="side-panel__body" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
