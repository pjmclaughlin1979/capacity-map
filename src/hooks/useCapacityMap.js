import { useEffect, useRef, useState } from "react";
import { loadSubstations } from "../data/loadSubstations.js";
import { sampleSubstations } from "../data/sampleSubstations.js";
import {
  CAPACITY_COLORS,
  CAPACITY_LEVELS,
  CAPACITY_MODES,
  INITIAL_EXTENT,
  ragToLevel,
  worstLevel,
} from "../config/capacityConfig.js";
import { buildCircleSymbol, buildSplitCircleSymbol } from "../utils/pinSymbols.js";

const MODE_TO_SECTION = {
  [CAPACITY_MODES.DEMAND]: "demand",
  [CAPACITY_MODES.GENERATION]: "generation",
  [CAPACITY_MODES.FAULT_LEVEL]: "faultLevel",
};

// A single substation's overall level: worst-of primary/bulk axes.
function levelForMode(substation, mode) {
  const section = substation[MODE_TO_SECTION[mode]];
  return worstLevel([ragToLevel(section.pri.rag), ragToLevel(section.bsp.rag)]);
}

// The two axes graded *independently* (not merged), for colouring the two
// halves of a split pin.
function sideLevelsForMode(substation, mode) {
  const section = substation[MODE_TO_SECTION[mode]];
  return {
    pri: ragToLevel(section.pri.rag) ?? CAPACITY_LEVELS.UNAVAILABLE,
    bsp: ragToLevel(section.bsp.rag) ?? CAPACITY_LEVELS.UNAVAILABLE,
  };
}

// Groups the flat row list into map pins. Most rows render as their own
// single-colour pin; two shapes in the source data represent two graded
// values sharing one location and get merged into a single split pin:
//  - Type "CSP" (splitPin "S"): one row with both a primary and a bulk
//    supply point axis.
//  - A pair of Primary rows sharing exact coordinates, marked splitPin
//    "L"/"R" (a dual-primary site, e.g. 33/11kV + 33/6.6kV at one site).
function groupIntoPins(substations) {
  const used = new Set();
  const pins = [];

  const lefts = substations.filter((s) => s.splitPin === "L");
  for (const left of lefts) {
    const right = substations.find(
      (s) =>
        s.splitPin === "R" &&
        !used.has(s.objectId) &&
        s.longitude === left.longitude &&
        s.latitude === left.latitude
    );
    if (right) {
      used.add(left.objectId);
      used.add(right.objectId);
      pins.push({
        id: `dual-${left.objectId}-${right.objectId}`,
        kind: "dualPrimary",
        longitude: left.longitude,
        latitude: left.latitude,
        substationType: "primary",
        left,
        right,
      });
    }
  }

  for (const s of substations) {
    if (used.has(s.objectId)) continue;
    used.add(s.objectId);
    pins.push({
      id: `${s.splitPin === "S" ? "combined" : "single"}-${s.objectId}`,
      kind: s.splitPin === "S" ? "combined" : "single",
      longitude: s.longitude,
      latitude: s.latitude,
      substationType: s.substationType,
      substation: s,
    });
  }

  return pins;
}

// arcgis-map's popup sanitizes injected HTML content and strips <style>
// tags outright (an XSS mitigation), so styling has to live on each
// element's own `style` attribute instead of a stylesheet or CSS classes.
const ROW_STYLE = "display:flex;justify-content:space-between;gap:0.75rem;margin:0.15rem 0;font-size:0.8rem;";
const DT_STYLE = "margin:0;color:#1c2530;font-weight:600;display:flex;align-items:center;gap:0.4rem;";
const DD_STYLE = "margin:0;color:#4a5560;text-align:right;";
const H4_STYLE = "margin:0.75rem 0 0.25rem;font-size:0.85rem;color:#0c2b4e;";
const SUMMARY_STYLE = "margin:0.5rem 0;padding:0.4rem 0.6rem;background:#f4f6f8;border-radius:6px;";
const SWATCH_STYLE = "display:inline-block;width:10px;height:10px;border-radius:50%;flex-shrink:0;";

function fmtMva(headroom) {
  return headroom === null || headroom === undefined ? null : `${headroom} MVA`;
}

function popupRow(label, value) {
  return value === null || value === undefined || value === ""
    ? ""
    : `<dl style="${ROW_STYLE}"><dt style="${DT_STYLE}">${label}</dt><dd style="${DD_STYLE}">${value}</dd></dl>`;
}

// The "headline" figure for a mode is the worst of the primary/network/BSP
// axes — matches the precomputed *_Headroom_Min field the source data
// carries for the same purpose.
function headlineHeadroom(section) {
  const values = [section.pri.headroom, section.net.headroom, section.bsp.headroom].filter(
    (v) => v !== null && v !== undefined
  );
  return values.length ? Math.min(...values) : null;
}

function summaryRow(label, mode, s) {
  const section = s[MODE_TO_SECTION[mode]];
  const level = levelForMode(s, mode);
  const value = fmtMva(headlineHeadroom(section)) ?? "Contact for info";
  return `<dl style="${ROW_STYLE}"><dt style="${DT_STYLE}"><span style="${SWATCH_STYLE}background:${CAPACITY_COLORS[level]};"></span>${label}</dt><dd style="${DD_STYLE}">${value}</dd></dl>`;
}

// Combined (Bulk + Primary) sites render as a two-colour split pin — one
// colour per axis (see sideLevelsForMode in symbolForPin) — so their popup
// summary needs one headline per axis too. A single blended row (as used
// for a plain bulk-only or primary-only pin) would hide which half is
// actually the constraint, and its colour wouldn't match either half of
// the pin that was just clicked.
function summaryRowForAxis(label, mode, s, axis) {
  const section = s[MODE_TO_SECTION[mode]];
  const level = ragToLevel(section[axis].rag) ?? CAPACITY_LEVELS.UNAVAILABLE;
  const value = fmtMva(section[axis].headroom) ?? "Contact for info";
  return `<dl style="${ROW_STYLE}"><dt style="${DT_STYLE}"><span style="${SWATCH_STYLE}background:${CAPACITY_COLORS[level]};"></span>${label}</dt><dd style="${DD_STYLE}">${value}</dd></dl>`;
}

function summaryBlockHtml(s) {
  if (s.substationType !== "combined") {
    return `
      ${summaryRow("Available Demand Headroom", CAPACITY_MODES.DEMAND, s)}
      ${summaryRow("Available Generation Headroom", CAPACITY_MODES.GENERATION, s)}
      ${summaryRow("Available Fault Level Headroom", CAPACITY_MODES.FAULT_LEVEL, s)}
    `;
  }
  return `
    ${summaryRowForAxis("Bulk Supply Point — Demand Headroom", CAPACITY_MODES.DEMAND, s, "bsp")}
    ${summaryRowForAxis("Primary Substation — Demand Headroom", CAPACITY_MODES.DEMAND, s, "pri")}
    ${summaryRowForAxis("Bulk Supply Point — Generation Headroom", CAPACITY_MODES.GENERATION, s, "bsp")}
    ${summaryRowForAxis("Primary Substation — Generation Headroom", CAPACITY_MODES.GENERATION, s, "pri")}
    ${summaryRowForAxis("Bulk Supply Point — Fault Level Headroom", CAPACITY_MODES.FAULT_LEVEL, s, "bsp")}
    ${summaryRowForAxis("Primary Substation — Fault Level Headroom", CAPACITY_MODES.FAULT_LEVEL, s, "pri")}
  `;
}

function buildPopupHtml(s) {
  return `
    <div>
      ${popupRow("Substation Type", s.substationType === "bulk" ? "Bulk Supply Point" : s.substationType === "combined" ? "Bulk + Primary (combined site)" : "Primary Substation")}
      ${popupRow("Voltage Domain (Primary)", s.voltageDomainPri)}
      ${popupRow("Voltage Domain (Bulk)", s.voltageDomainBsp)}
      ${popupRow("Bulk Supply Point", s.bulkSupplyPoint)}

      <div style="${SUMMARY_STYLE}">
        ${summaryBlockHtml(s)}
      </div>

      <h4 style="${H4_STYLE}">Demand Availability</h4>
      ${popupRow("Transformer Headroom", fmtMva(s.demand.pri.headroom))}
      ${popupRow("Upstream Headroom (Distribution)", fmtMva(s.demand.net.headroom))}
      ${popupRow("Upstream Headroom (BSP)", fmtMva(s.demand.bsp.headroom))}
      ${s.demand.comment ? `<p>${s.demand.comment}</p>` : ""}

      <h4 style="${H4_STYLE}">Generation Availability</h4>
      ${popupRow("Substation Generation Capacity", fmtMva(s.generation.pri.capacity))}
      ${popupRow("Connected Generation", fmtMva(s.generation.pri.connected ?? s.generation.bsp.connected))}
      ${popupRow("Committed (Not Yet Connected)", fmtMva(s.generation.pri.committed ?? s.generation.bsp.committed))}
      ${popupRow("Substation Generation Headroom", fmtMva(s.generation.pri.headroom))}
      ${popupRow("Upstream Headroom (Distribution)", fmtMva(s.generation.net.headroom))}
      ${popupRow("Upstream Headroom (BSP)", fmtMva(s.generation.bsp.headroom))}
      ${s.generation.comment ? `<p>${s.generation.comment}</p>` : ""}

      <h4 style="${H4_STYLE}">Fault Level Availability</h4>
      ${popupRow("Substation Fault Headroom", fmtMva(s.faultLevel.pri.headroom))}
      ${popupRow("Upstream Headroom (Distribution)", fmtMva(s.faultLevel.net.headroom))}
      ${popupRow("Upstream Headroom (BSP)", fmtMva(s.faultLevel.bsp.headroom))}
      ${s.faultLevel.comment ? `<p>${s.faultLevel.comment}</p>` : ""}
      ${s.otherComment ? `<p>${s.otherComment}</p>` : ""}
    </div>
  `;
}

function baseName(name) {
  return name.replace(/\s*\[[^\]]*\]\s*$/, "");
}

function buildDualPopupHtml(left, right) {
  return `
    <div>
      <h4 style="${H4_STYLE}">${left.voltageDomainPri || "Primary"}</h4>
      ${buildPopupHtml(left)}
      <hr />
      <h4 style="${H4_STYLE}">${right.voltageDomainPri || "Primary"}</h4>
      ${buildPopupHtml(right)}
    </div>
  `;
}

function popupTemplateForPin(pin) {
  if (pin.kind === "dualPrimary") {
    return { title: baseName(pin.left.name), content: buildDualPopupHtml(pin.left, pin.right) };
  }
  return { title: pin.substation.name, content: buildPopupHtml(pin.substation) };
}

// All pins render at one fixed size — the label's own multiplier (see
// pinSymbols.js) already gives two-letter labels ("BP"/"PP") extra room
// relative to one-letter ones, so a single size works for every kind.
const PIN_SIZE = 22;
function sizeForPin() {
  return PIN_SIZE;
}

// Matches the source map's on-pin lettering: B = Bulk Supply Point,
// P = Primary Substation, BP = combined Bulk+Primary site, PP = dual
// Primary site (see the FAQ content in KeyContent.jsx).
function labelForPin(pin) {
  if (pin.kind === "combined") return "BP";
  if (pin.kind === "dualPrimary") return "PP";
  return pin.substationType === "bulk" ? "B" : "P";
}

function symbolForPin(pin, mode) {
  const outlineColor = "#ffffff";
  const size = sizeForPin(pin);
  const label = labelForPin(pin);

  if (pin.kind === "combined") {
    const { pri, bsp } = sideLevelsForMode(pin.substation, mode);
    return buildSplitCircleSymbol({
      leftColor: CAPACITY_COLORS[bsp],
      rightColor: CAPACITY_COLORS[pri],
      size,
      outlineColor,
      label,
    });
  }

  if (pin.kind === "dualPrimary") {
    return buildSplitCircleSymbol({
      leftColor: CAPACITY_COLORS[levelForMode(pin.left, mode)],
      rightColor: CAPACITY_COLORS[levelForMode(pin.right, mode)],
      size,
      outlineColor,
      label,
    });
  }

  return buildCircleSymbol({
    color: CAPACITY_COLORS[levelForMode(pin.substation, mode)],
    size,
    outlineColor,
    label,
  });
}

// Overall level used for the level filter chips — worst across both halves
// for a split pin, so unchecking "Low" hides a pin with any red half.
function overallLevelForPin(pin, mode) {
  if (pin.kind === "combined") {
    const { pri, bsp } = sideLevelsForMode(pin.substation, mode);
    return worstLevel([pri, bsp]);
  }
  if (pin.kind === "dualPrimary") {
    return worstLevel([levelForMode(pin.left, mode), levelForMode(pin.right, mode)]);
  }
  return levelForMode(pin.substation, mode);
}

/**
 * Boots a 2D ArcGIS MapView against the <arcgis-map> web component and
 * renders NIE Networks' live substation capacity feature service as a
 * GraphicsLayer, colour-coded by the service's own precomputed RAG
 * grading for whichever mode/filters are currently selected. Falls back
 * to a small bundled sample dataset if the live service can't be reached.
 *
 * Graphics (not a renderer-driven FeatureLayer) are used deliberately:
 * the colour for each point depends on the *combination* of live UI
 * filters (mode + substation type + level) plus, for combined/dual-primary
 * sites, a two-colour split symbol - simplest to express as an imperative
 * per-graphic symbol update rather than reshaping a renderer on every change.
 * Each pin is exactly one Graphic: the circle/split-circle fill and the
 * B/P/BP/PP label both live in the same CIM symbol (see pinSymbols.js), so
 * there's nothing stacked on top to double up hit-testing on click.
 */
export function useCapacityMap(mapElementRef, filters) {
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "error"
  const [error, setError] = useState(null);
  const [usingSampleData, setUsingSampleData] = useState(false);
  const viewRef = useRef(null);
  const graphicsRef = useRef([]); // [{ graphic, pin }]

  // Bootstrap the view + graphics layer once.
  useEffect(() => {
    const mapEl = mapElementRef.current;
    if (!mapEl) return;

    let cancelled = false;
    let layer = null;
    const abortController = new AbortController();

    async function handleReady() {
      try {
        const [{ default: GraphicsLayer }, { default: Graphic }, { default: Extent }] =
          await Promise.all([
            import("@arcgis/core/layers/GraphicsLayer.js"),
            import("@arcgis/core/Graphic.js"),
            import("@arcgis/core/geometry/Extent.js"),
          ]);
        if (cancelled) return;

        let substations;
        try {
          substations = await loadSubstations({ signal: abortController.signal });
        } catch (fetchErr) {
          if (cancelled) return;
          console.warn("Falling back to sample data — live feature service unreachable:", fetchErr);
          substations = sampleSubstations;
          setUsingSampleData(true);
        }
        if (cancelled) return;

        const view = mapEl.view;
        viewRef.current = view;

        // Default dock position is "auto", which resolves to top-right on
        // wide views — the same corner as the search widget, so a manually
        // docked/maximized popup lands underneath it and its close button
        // becomes unreachable. Bottom-right has no other UI in it.
        view.popup.dockOptions = { ...view.popup.dockOptions, position: "bottom-right" };

        layer = new GraphicsLayer({ title: "Substation Capacity" });
        view.map.add(layer);

        const pins = groupIntoPins(substations);

        graphicsRef.current = pins.map((pin) => {
          const graphic = new Graphic({
            geometry: { type: "point", longitude: pin.longitude, latitude: pin.latitude },
            attributes: { id: pin.id },
            popupTemplate: popupTemplateForPin(pin),
          });
          layer.add(graphic);
          return { graphic, pin };
        });

        await view.goTo(new Extent(INITIAL_EXTENT));
        if (cancelled) return;

        // The Home widget defaults to whatever viewpoint existed at the
        // moment it was created, which races this extent-loading fetch —
        // pin it explicitly so Home always returns to the loaded extent.
        const homeEl = mapEl.querySelector("arcgis-home");
        if (homeEl) homeEl.viewpoint = view.viewpoint.clone();

        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to initialize capacity map", err);
        setError(err?.message ?? "Something went wrong loading the map.");
        setStatus("error");
      }
    }

    mapEl.addEventListener("arcgisViewReadyChange", handleReady, { once: true });

    return () => {
      cancelled = true;
      abortController.abort();
      mapEl.removeEventListener("arcgisViewReadyChange", handleReady);
      layer?.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-symbolize + filter graphics whenever the mode/type/level filters change.
  useEffect(() => {
    if (status !== "ready") return;

    for (const { graphic, pin } of graphicsRef.current) {
      graphic.symbol = symbolForPin(pin, filters.mode);
      graphic.visible =
        filters.substationTypes.has(pin.substationType) &&
        filters.levels.has(overallLevelForPin(pin, filters.mode));
    }
  }, [status, filters.mode, filters.substationTypes, filters.levels]);

  return { status, error, usingSampleData, viewRef };
}
