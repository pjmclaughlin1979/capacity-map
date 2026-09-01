import {
  CAPACITY_COLORS,
  CAPACITY_LABELS,
  CAPACITY_LEVELS,
  CAPACITY_MODES,
  CAPACITY_MODE_LABELS,
  SUBSTATION_TYPES,
  SUBSTATION_TYPE_LABELS,
} from "../config/capacityConfig.js";
import "./FilterPanel.css";

export default function FilterPanel({
  mode,
  onModeChange,
  substationTypes,
  onToggleType,
  levels,
  onToggleLevel,
  onOpenKey,
  onOpenFaq,
  showActions = true,
}) {
  return (
    <div className="filter-panel">
      <div className="filter-panel__group">
        <span className="filter-panel__label">Available Capacity</span>
        <div className="filter-panel__chips">
          {Object.values(CAPACITY_LEVELS).map((level) => (
            <button
              key={level}
              type="button"
              className={`chip ${levels.has(level) ? "chip--active" : ""}`}
              onClick={() => onToggleLevel(level)}
              aria-pressed={levels.has(level)}
            >
              <span className="chip__swatch" style={{ background: CAPACITY_COLORS[level] }} />
              {CAPACITY_LABELS[level]}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-panel__group">
        <span className="filter-panel__label">Substation Type</span>
        <div className="filter-panel__chips">
          {Object.values(SUBSTATION_TYPES).map((type) => (
            <button
              key={type}
              type="button"
              className={`chip ${substationTypes.has(type) ? "chip--active" : ""}`}
              onClick={() => onToggleType(type)}
              aria-pressed={substationTypes.has(type)}
            >
              {SUBSTATION_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-panel__group">
        <span className="filter-panel__label">Capacity Mode</span>
        <div className="filter-panel__chips">
          {Object.values(CAPACITY_MODES).map((m) => (
            <button
              key={m}
              type="button"
              className={`chip ${mode === m ? "chip--active" : ""}`}
              onClick={() => onModeChange(m)}
              aria-pressed={mode === m}
            >
              {CAPACITY_MODE_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      {showActions && (
        <div className="filter-panel__group filter-panel__group--actions">
          <button type="button" className="filter-panel__link" onClick={onOpenKey}>
            Key
          </button>
          <button type="button" className="filter-panel__link" onClick={onOpenFaq}>
            FAQs
          </button>
        </div>
      )}
    </div>
  );
}
