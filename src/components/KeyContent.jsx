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
          <span className="key-legend__swatch" style={{ background: CAPACITY_COLORS[level] }} />
          <span>{CAPACITY_LABELS[level]}</span>
        </div>
      ))}
    </>
  );
}
