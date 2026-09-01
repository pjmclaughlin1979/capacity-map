// Builds CIM point symbols for map pins, with the B/P/BP/PP label baked
// in as part of the symbol itself (a CIMTextSymbol markerGraphic sharing
// the same CIMVectorMarker as the circle fill). Previously the label was
// a second Graphic stacked on top of the marker Graphic; that made every
// pin hit-testable twice, so clicking a pin opened a popup with the same
// feature listed twice ("1 of 2"). Baking the label into the marker's own
// symbol means each pin is exactly one Graphic again.

function arcPoints(radius, fromDeg, toDeg, segments = 24) {
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const t = fromDeg + ((toDeg - fromDeg) * i) / segments;
    const rad = (t * Math.PI) / 180;
    points.push([radius * Math.cos(rad), radius * Math.sin(rad)]);
  }
  return points;
}

const RADIUS = 5;

// Tip extends this far below the head's center; a longer tip relative to
// the head radius gives a sharper point (classic "map pin" silhouette).
const TIP_LENGTH = RADIUS * 1.6;
const TANGENT_ANGLE_DEG = (Math.acos(RADIUS / TIP_LENGTH) * 180) / Math.PI;
const RIGHT_TANGENT_DEG = -90 + TANGENT_ANGLE_DEG;
const LEFT_TANGENT_DEG = 270 - TANGENT_ANGLE_DEG;

// A "map pin" outline: a circular head with a pointed tail hanging straight
// down from its center, formed by the two lines tangent to the head circle
// from the tip point. halfRing splits it along the same vertical centerline
// the tip already sits on, so left/right halves meet cleanly at the tip.
function teardropHalfRing(radius, side) {
  const tip = [0, -TIP_LENGTH];
  const arc =
    side === "right"
      ? arcPoints(radius, RIGHT_TANGENT_DEG, 90, 16)
      : arcPoints(radius, 90, LEFT_TANGENT_DEG, 16);
  return [...arc, tip, arc[0]];
}

function teardropRing(radius) {
  const arc = arcPoints(radius, RIGHT_TANGENT_DEG, LEFT_TANGENT_DEG, 32);
  return [...arc, [0, -TIP_LENGTH], arc[0]];
}

function hexToRgba(hex, alpha = 255) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, alpha];
}

function fillMarkerGraphic(ring, fillHex, outlineRgba) {
  return {
    type: "CIMMarkerGraphic",
    geometry: { rings: [ring] },
    symbol: {
      type: "CIMPolygonSymbol",
      symbolLayers: [
        { type: "CIMSolidStroke", enable: true, color: outlineRgba, width: 1 },
        { type: "CIMSolidFill", enable: true, color: hexToRgba(fillHex) },
      ],
    },
  };
}

// height is in the marker's local frame units (same space as radius),
// not screen points — it gets scaled up by the frame->size mapping along
// with the rest of the marker graphics.
function textMarkerGraphic(text, height, { color = "#ffffff", haloColor = "#1c2530" } = {}) {
  return {
    type: "CIMMarkerGraphic",
    geometry: { x: 0, y: 0 },
    textString: text,
    symbol: {
      type: "CIMTextSymbol",
      fontFamilyName: "sans-serif",
      fontStyleName: "Bold",
      height,
      horizontalAlignment: "Center",
      verticalAlignment: "Center",
      haloSize: 0.6,
      haloSymbol: {
        type: "CIMPolygonSymbol",
        symbolLayers: [{ type: "CIMSolidFill", enable: true, color: hexToRgba(haloColor) }],
      },
      symbol: {
        type: "CIMPolygonSymbol",
        symbolLayers: [{ type: "CIMSolidFill", enable: true, color: hexToRgba(color) }],
      },
    },
  };
}

function cimPointSymbol(markerGraphics, size) {
  return {
    type: "cim",
    data: {
      type: "CIMSymbolReference",
      symbol: {
        type: "CIMPointSymbol",
        symbolLayers: [
          {
            type: "CIMVectorMarker",
            enable: true,
            size,
            frame: { xmin: -RADIUS, ymin: -TIP_LENGTH, xmax: RADIUS, ymax: RADIUS },
            markerGraphics,
          },
        ],
      },
    },
  };
}

export function buildCircleSymbol({ color, size = 14, outlineColor = "#ffffff", label }) {
  const outlineRgba = hexToRgba(outlineColor);
  const graphics = [fillMarkerGraphic(teardropRing(RADIUS), color, outlineRgba)];
  if (label) graphics.push(textMarkerGraphic(label, RADIUS * 1.1));
  return cimPointSymbol(graphics, size);
}

export function buildSplitCircleSymbol({ leftColor, rightColor, size = 16, outlineColor = "#ffffff", label }) {
  const outlineRgba = hexToRgba(outlineColor);
  const graphics = [
    fillMarkerGraphic(teardropHalfRing(RADIUS, "left"), leftColor, outlineRgba),
    fillMarkerGraphic(teardropHalfRing(RADIUS, "right"), rightColor, outlineRgba),
  ];
  // Two-character labels ("BP"/"PP") need a touch more room than one.
  if (label) graphics.push(textMarkerGraphic(label, RADIUS * (label.length > 1 ? 0.95 : 1.1)));
  return cimPointSymbol(graphics, size);
}
