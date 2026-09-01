import "./NieHeader.css";

export default function NieHeader({ onOpenKey, onOpenFaq, filtersVisible, onToggleFilters }) {
  return (
    <header className="nie-header">
      <div className="nie-header__top">
        <div className="nie-header__brand">
          <span className="nie-header__brand-mark" aria-hidden="true" />
          <span className="nie-header__brand-text">
            Network
            <br />
            Capacity Map
          </span>
        </div>
        <div className="nie-header__top-actions">
          <a className="nie-header__style-link" href="./index.html">
            Classic layout
          </a>
          <button type="button" className="nie-header__menu" aria-label="Menu">
            <span className="nie-header__menu-bars" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            Menu
          </button>
        </div>
      </div>

      <svg className="nie-header__wave" viewBox="0 0 800 60" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,30 C150,70 350,-10 500,25 C650,55 750,10 800,20 L800,60 L0,60 Z" />
      </svg>

      <div className="nie-header__title-bar">
        <h1>Network Capacity Map</h1>
        <div className="nie-header__actions">
          <button
            type="button"
            className={filtersVisible ? "is-active" : ""}
            aria-pressed={filtersVisible}
            onClick={onToggleFilters}
          >
            Filters
          </button>
          <button type="button" onClick={onOpenFaq}>
            FAQs
          </button>
          <button type="button" onClick={onOpenKey}>
            Key
          </button>
        </div>
      </div>
    </header>
  );
}
