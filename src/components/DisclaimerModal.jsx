import { useState } from "react";
import "./DisclaimerModal.css";

export default function DisclaimerModal({ onAccept }) {
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="disclaimer-modal__backdrop" role="presentation">
      <div className="disclaimer-modal" role="dialog" aria-modal="true" aria-label="Disclaimer">
        <h2>Disclaimer</h2>
        <p>
          This map gives a general illustration of available network capacity at substation
          level, to assist with early-stage connection enquiries. It gives a general illustration
          of availability only and cannot be relied upon to assess the terms of connection for
          specific premises. While reasonable care is taken to keep the map and its data accurate,
          no warranty is given, and no responsibility is accepted, for any loss arising from
          reliance on this map or the information it presents. Always confirm capacity and
          connection terms directly with the network operator before making any decisions.
        </p>
        <label className="disclaimer-modal__checkbox">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
          />
          I accept the Terms &amp; Conditions
        </label>
        <button
          type="button"
          className="disclaimer-modal__ok"
          disabled={!accepted}
          onClick={onAccept}
        >
          OK
        </button>
      </div>
    </div>
  );
}
