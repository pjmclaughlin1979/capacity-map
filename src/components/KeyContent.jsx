import { CAPACITY_COLORS, CAPACITY_LABELS, CAPACITY_LEVELS } from "../config/capacityConfig.js";

export default function KeyContent() {
  return (
    <>
      <h3>Substation type</h3>
      <p>
        All pins are the same size; the letters distinguish substation type:
      </p>
      <ul>
        <li><strong>B</strong> — Bulk Supply Point (110/33kV).</li>
        <li><strong>P</strong> — Primary Substation (33/11kV or 33/6.6kV).</li>
        <li>
          <strong>BP</strong> — a combined site: a Bulk Supply Point and a Primary Substation at
          one location. Split down the middle: Bulk Supply Point grading on the left, Primary's
          on the right.
        </li>
        <li>
          <strong>PP</strong> — a dual-primary site: both a 33/11kV and a 33/6.6kV substation at
          one location. Split down the middle, each half graded independently.
        </li>
      </ul>

      <h3>Pin colour</h3>
      {Object.values(CAPACITY_LEVELS).map((level) => (
        <div className="key-legend" key={level}>
          <svg className="key-legend__swatch" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 0C7.31 0 3.5 3.81 3.5 8.5c0 6.5 8.5 15.5 8.5 15.5s8.5-9 8.5-15.5C20.5 3.81 16.69 0 12 0z"
              fill={CAPACITY_COLORS[level]}
              stroke="#ffffff"
              strokeWidth="1"
            />
          </svg>
          <span>{CAPACITY_LABELS[level]}</span>
        </div>
      ))}
    </>
  );
}
