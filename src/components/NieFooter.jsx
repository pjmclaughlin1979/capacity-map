import "./NieFooter.css";

const SOCIAL_ICON_LABELS = ["f", "x", "in", "▶"];

export default function NieFooter({ onOpenKey, onOpenFaq }) {
  return (
    <footer className="nie-footer">
      <div className="nie-footer__top">
        <h2>Understanding Your Network</h2>
        <ul className="nie-footer__social" aria-hidden="true">
          {SOCIAL_ICON_LABELS.map((label) => (
            <li key={label}>
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="nie-footer__columns">
        <div className="nie-footer__column">
          <h3>Map</h3>
          <ul>
            <li>
              <button type="button" onClick={onOpenKey}>
                Key
              </button>
            </li>
            <li>
              <button type="button" onClick={onOpenFaq}>
                FAQs
              </button>
            </li>
          </ul>
        </div>

        <div className="nie-footer__column">
          <h3>About</h3>
          <ul>
            <li>Independent demo project</li>
            <li>Not affiliated with any network operator</li>
          </ul>
        </div>

        <div className="nie-footer__column">
          <h3>Data</h3>
          <ul>
            <li>Sample / illustrative data</li>
            <li>For demonstration purposes only</li>
          </ul>
        </div>
      </div>

      <div className="nie-footer__bottom">
        <span>Network Capacity Map — personal project, unaffiliated demo. © 2026</span>
      </div>
    </footer>
  );
}
