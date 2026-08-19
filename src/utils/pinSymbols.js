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

function halfDiscRing(radius, side) {
  // "right" bulges toward +x through 0deg; "left" bulges toward -x through 180deg.
  // Each ring's straight closing edge is the vertical diameter (x = 0).
  const ring = side === "right" ? arcPoints(radius, -90, 90) : arcPoints(radius, 90, 270);
  return [...ring, ring[0]];
}

function fullDiscRing(radius) {
  const ring = arcPoints(radius, -180, 180, 32);
  return [...ring, ring[0]];
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

const RADIUS = 5;

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
            frame: { xmin: -RADIUS, ymin: -RADIUS, xmax: RADIUS, ymax: RADIUS },
            markerGraphics,
          },
        ],
      },
    },
  };
}

export function buildCircleSymbol({ color, size = 14, outlineColor = "#ffffff", label }) {
  const outlineRgba = hexToRgba(outlineColor);
  const graphics = [fillMarkerGraphic(fullDiscRing(RADIUS), color, outlineRgba)];
  if (label) graphics.push(textMarkerGraphic(label, RADIUS * 0.85));
  return cimPointSymbol(graphics, size);
}

export function buildSplitCircleSymbol({ leftColor, rightColor, size = 16, outlineColor = "#ffffff", label }) {
  const outlineRgba = hexToRgba(outlineColor);
  const graphics = [
    fillMarkerGraphic(halfDiscRing(RADIUS, "left"), leftColor, outlineRgba),
    fillMarkerGraphic(halfDiscRing(RADIUS, "right"), rightColor, outlineRgba),
  ];
  // Two-character labels ("BP"/"PP") need a touch more room than one.
  if (label) graphics.push(textMarkerGraphic(label, RADIUS * (label.length > 1 ? 0.75 : 0.85)));
  return cimPointSymbol(graphics, size);
}
