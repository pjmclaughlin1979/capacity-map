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

function sectionHeadingHtml(label, level) {
  return `<h4 style="${H4_STYLE}display:flex;align-items:center;gap:0.4rem;"><span style="${SWATCH_STYLE}background:${CAPACITY_COLORS[level]};"></span>${label}</h4>`;
}

// RAG colour for each availability section's heading. For a plain pin (or
// a dual-primary side), that's the same blended pri+bsp level shown in the
// summary popup. For one axis of a combined pin, it's that axis's own RAG
// alone — matching summaryRowForAxis and the pin's own split colouring.
function levelsForRow(s, axis) {
  if (!axis) {
    return {
      demand: levelForMode(s, CAPACITY_MODES.DEMAND),
      generation: levelForMode(s, CAPACITY_MODES.GENERATION),
      faultLevel: levelForMode(s, CAPACITY_MODES.FAULT_LEVEL),
    };
  }
  return {
    demand: ragToLevel(s.demand[axis].rag) ?? CAPACITY_LEVELS.UNAVAILABLE,
    generation: ragToLevel(s.generation[axis].rag) ?? CAPACITY_LEVELS.UNAVAILABLE,
    faultLevel: ragToLevel(s.faultLevel[axis].rag) ?? CAPACITY_LEVELS.UNAVAILABLE,
  };
}

function detailHeaderRowsForRow(s) {
  return `
    ${popupRow("Substation Type", s.substationType === "bulk" ? "Bulk Supply Point" : s.substationType === "combined" ? "Bulk + Primary (combined site)" : "Primary Substation")}
    ${popupRow("Voltage Domain (Primary)", s.voltageDomainPri)}
    ${popupRow("Voltage Domain (Bulk)", s.voltageDomainBsp)}
    ${popupRow("Bulk Supply Point", s.bulkSupplyPoint)}
  `;
}

// Side-panel-only header: Latitude/Longitude are shown here but not in the
// compact popup — matching the source site (its popup omits them too).
function detailHeaderWithLatLongHtml(s) {
  return `
    ${popupRow("Substation Type", s.substationType === "bulk" ? "Bulk Supply Point" : s.substationType === "combined" ? "Bulk + Primary (combined site)" : "Primary Substation")}
    ${popupRow("Latitude", s.latitude)}
    ${popupRow("Longitude", s.longitude)}
    ${popupRow("Voltage Domain (Primary)", s.voltageDomainPri)}
    ${popupRow("Voltage Domain (Bulk)", s.voltageDomainBsp)}
    ${popupRow("Bulk Supply Point", s.bulkSupplyPoint)}
  `;
}

// The full breakdown for one row, primary-axis-centric (transformer/network/
// upstream-BSP) — used for single pins, each side of a dual-primary pin, and
// the "Primary Substation" button of a combined pin.
function detailSectionsHtml(s, levels) {
  return `
    ${sectionHeadingHtml("Demand Availability", levels.demand)}
    ${popupRow("Transformer Headroom", fmtMva(s.demand.pri.headroom))}
    ${popupRow("Upstream Headroom (Distribution)", fmtMva(s.demand.net.headroom))}
    ${popupRow("Upstream Headroom (BSP)", fmtMva(s.demand.bsp.headroom))}
    ${s.demand.comment ? `<p>${s.demand.comment}</p>` : ""}

    ${sectionHeadingHtml("Generation Availability", levels.generation)}
    ${popupRow("Substation Generation Capacity", fmtMva(s.generation.pri.capacity))}
    ${popupRow("Connected Generation", fmtMva(s.generation.pri.connected ?? s.generation.bsp.connected))}
    ${popupRow("Committed (Not Yet Connected)", fmtMva(s.generation.pri.committed ?? s.generation.bsp.committed))}
    ${popupRow("Substation Generation Headroom", fmtMva(s.generation.pri.headroom))}
    ${popupRow("Upstream Headroom (Distribution)", fmtMva(s.generation.net.headroom))}
    ${popupRow("Upstream Headroom (BSP)", fmtMva(s.generation.bsp.headroom))}
    ${s.generation.comment ? `<p>${s.generation.comment}</p>` : ""}

    ${sectionHeadingHtml("Fault Level Availability", levels.faultLevel)}
    ${popupRow("Substation Fault Headroom", fmtMva(s.faultLevel.pri.headroom))}
    ${popupRow("Upstream Headroom (Distribution)", fmtMva(s.faultLevel.net.headroom))}
    ${popupRow("Upstream Headroom (BSP)", fmtMva(s.faultLevel.bsp.headroom))}
    ${s.faultLevel.comment ? `<p>${s.faultLevel.comment}</p>` : ""}
    ${s.otherComment ? `<p>${s.otherComment}</p>` : ""}
  `;
}

// The Bulk Supply Point half of a combined site, on its own axis only —
// matches what a standalone "bulk" substation's own detail would show,
// rather than repeating the primary-side transformer/network figures.
function bulkDetailSectionsHtml(s, levels) {
  return `
    ${sectionHeadingHtml("Demand Availability", levels.demand)}
    ${popupRow("Bulk Supply Point Headroom", fmtMva(s.demand.bsp.headroom))}

    ${sectionHeadingHtml("Generation Availability", levels.generation)}
    ${popupRow("Bulk Supply Point Generation Capacity", fmtMva(s.generation.bsp.capacity))}
    ${popupRow("Connected Generation", fmtMva(s.generation.bsp.connected))}
    ${popupRow("Committed (Not Yet Connected)", fmtMva(s.generation.bsp.committed))}
    ${popupRow("Bulk Supply Point Generation Headroom", fmtMva(s.generation.bsp.headroom))}

    ${sectionHeadingHtml("Fault Level Availability", levels.faultLevel)}
    ${popupRow("Bulk Supply Point Fault Headroom", fmtMva(s.faultLevel.bsp.headroom))}
  `;
}

function detailHtmlForRow(s, axis) {
  return `<div>${detailHeaderWithLatLongHtml(s)}${detailSectionsHtml(s, levelsForRow(s, axis))}</div>`;
}

function detailHtmlForBulkAxis(s) {
  return `<div>${detailHeaderWithLatLongHtml(s)}${bulkDetailSectionsHtml(s, levelsForRow(s, "bsp"))}</div>`;
}

function baseName(name) {
  return name.replace(/\s*\[[^\]]*\]\s*$/, "");
}

// The map popup itself only ever shows a compact summary plus a "Show
// Information" action (or two, for a split pin) — matching the source
// map's own pattern of a minimal popup that hands off to a side panel for
// the full breakdown, rather than cramming everything into the popup.
function minimalPopupHtml(pin) {
  if (pin.kind === "dualPrimary") {
    const { left, right } = pin;
    const leftLabel = left.voltageDomainPri || "Primary";
    const rightLabel = right.voltageDomainPri || "Primary";
    return `
      <div>
        ${popupRow("Substation Type", "Dual Primary Substation")}
        ${popupRow("Voltage Domain 1", leftLabel)}
        ${popupRow("Voltage Domain 2", rightLabel)}
        ${popupRow("Bulk Supply Point", left.bulkSupplyPoint)}
        <div style="${SUMMARY_STYLE}">
          ${summaryRow(`Available Demand Headroom (${leftLabel})`, CAPACITY_MODES.DEMAND, left)}
          ${summaryRow(`Available Demand Headroom (${rightLabel})`, CAPACITY_MODES.DEMAND, right)}
          ${summaryRow(`Available Generation Headroom (${leftLabel})`, CAPACITY_MODES.GENERATION, left)}
          ${summaryRow(`Available Generation Headroom (${rightLabel})`, CAPACITY_MODES.GENERATION, right)}
          ${summaryRow(`Available Fault Level Headroom (${leftLabel})`, CAPACITY_MODES.FAULT_LEVEL, left)}
          ${summaryRow(`Available Fault Level Headroom (${rightLabel})`, CAPACITY_MODES.FAULT_LEVEL, right)}
        </div>
      </div>
    `;
  }

  const s = pin.substation;
  return `
    <div>
      ${detailHeaderRowsForRow(s)}
      <div style="${SUMMARY_STYLE}">${summaryBlockHtml(s)}</div>
    </div>
  `;
}

// One "Show Information" action per axis: a single button for a plain
// bulk-only or primary-only pin, two for a split (combined or
// dual-primary) pin. The pin id + axis key are encoded into the action id
// so the trigger-action handler can look up which detail view to show.
function actionsForPin(pin) {
  if (pin.kind === "combined") {
    return [
      { id: `showinfo|${pin.id}|bsp`, title: "Show Information - Bulk Supply Point" },
      { id: `showinfo|${pin.id}|pri`, title: "Show Information - Primary Substation" },
    ];
  }
  if (pin.kind === "dualPrimary") {
    return [
      { id: `showinfo|${pin.id}|left`, title: `Show Information - ${pin.left.voltageDomainPri || "Primary"}` },
      { id: `showinfo|${pin.id}|right`, title: `Show Information - ${pin.right.voltageDomainPri || "Primary"}` },
    ];
  }
  return [{ id: `showinfo|${pin.id}|_`, title: "Show Information" }];
}

function popupTemplateForPin(pin) {
  const title = pin.kind === "dualPrimary" ? baseName(pin.left.name) : pin.substation.name;
  return { title, content: minimalPopupHtml(pin), actions: actionsForPin(pin) };
}

// Resolves a "Show Information" action back to the side-panel title + HTML
// for the specific axis that was clicked.
function sidePanelContentForAction(pin, axisKey) {
  if (pin.kind === "combined") {
    const s = pin.substation;
    return axisKey === "bsp"
      ? { title: `${baseName(s.name)} — Bulk Supply Point`, html: detailHtmlForBulkAxis(s) }
      : { title: `${baseName(s.name)} — Primary Substation`, html: detailHtmlForRow(s, "pri") };
  }
  if (pin.kind === "dualPrimary") {
    const row = axisKey === "left" ? pin.left : pin.right;
    return { title: `${baseName(row.name)} — ${row.voltageDomainPri || "Primary"}`, html: detailHtmlForRow(row) };
  }
  const s = pin.substation;
  return { title: s.name, html: detailHtmlForRow(s) };
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
  const [sidePanel, setSidePanel] = useState(null); // { title, html } | null
  const viewRef = useRef(null);
  const graphicsRef = useRef([]); // [{ graphic, pin }]
  const pinsByIdRef = useRef(new Map());

  // Bootstrap the view + graphics layer once.
  useEffect(() => {
    const mapEl = mapElementRef.current;
    if (!mapEl) return;

    let cancelled = false;
    let layer = null;
    let handleTriggerAction = null;
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

        // view.popup here is a plain reactive snapshot (no .on()/.viewModel),
        // and the default popup's action buttons render as <calcite-action>
        // elements with no component-level "trigger action" event exposed —
        // so a plain (shadow-DOM-crossing) click listener reading the
        // clicked action's data-action-id is the reliable way to hear about
        // them. The popup itself only ever shows a compact summary; its
        // "Show Information" action(s) (see actionsForPin) hand off to the
        // side panel for the full breakdown, matching the source map's own
        // popup-then-panel pattern.
        handleTriggerAction = (event) => {
          const actionEl = event
            .composedPath()
            .find((el) => el.tagName === "CALCITE-ACTION" && el.dataset?.actionId);
          if (!actionEl) return;
          const [kind, pinId, axisKey] = actionEl.dataset.actionId.split("|");
          if (kind !== "showinfo") return;
          const pin = pinsByIdRef.current.get(pinId);
          if (!pin) return;
          setSidePanel(sidePanelContentForAction(pin, axisKey));
        };
        mapEl.addEventListener("click", handleTriggerAction);

        layer = new GraphicsLayer({ title: "Substation Capacity" });
        view.map.add(layer);

        const pins = groupIntoPins(substations);
        pinsByIdRef.current = new Map(pins.map((pin) => [pin.id, pin]));

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
      if (handleTriggerAction) mapEl.removeEventListener("click", handleTriggerAction);
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

  return {
    status,
    error,
    usingSampleData,
    viewRef,
    sidePanel,
    closeSidePanel: () => setSidePanel(null),
  };
}
