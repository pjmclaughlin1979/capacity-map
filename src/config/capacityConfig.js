// Colour rules for the capacity map. The backing feature service already
// grades each headroom figure Red/Amber/Green/Blue ("data unavailable")
// server-side, so the UI maps that grading straight to colour rather than
// re-deriving it from raw MVA thresholds.

export const CAPACITY_LEVELS = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
  UNAVAILABLE: "unavailable",
};

export const CAPACITY_COLORS = {
  [CAPACITY_LEVELS.HIGH]: "#5cb85c",
  [CAPACITY_LEVELS.MEDIUM]: "#f0ad4e",
  [CAPACITY_LEVELS.LOW]: "#d9534f",
  [CAPACITY_LEVELS.UNAVAILABLE]: "#5b8dc9",
};

export const CAPACITY_LABELS = {
  [CAPACITY_LEVELS.HIGH]: "High",
  [CAPACITY_LEVELS.MEDIUM]: "Medium",
  [CAPACITY_LEVELS.LOW]: "Low",
  [CAPACITY_LEVELS.UNAVAILABLE]: "Contact for info",
};

export const CAPACITY_MODES = {
  DEMAND: "demand",
  GENERATION: "generation",
  FAULT_LEVEL: "faultLevel",
};

export const CAPACITY_MODE_LABELS = {
  [CAPACITY_MODES.DEMAND]: "Demand",
  [CAPACITY_MODES.GENERATION]: "Generation",
  [CAPACITY_MODES.FAULT_LEVEL]: "Fault Level",
};

export const SUBSTATION_TYPES = {
  BULK: "bulk",
  PRIMARY: "primary",
  COMBINED: "combined",
};

export const SUBSTATION_TYPE_LABELS = {
  [SUBSTATION_TYPES.BULK]: "Bulk",
  [SUBSTATION_TYPES.PRIMARY]: "Primary",
  [SUBSTATION_TYPES.COMBINED]: "Combined (Bulk + Primary)",
};

const RAG_TO_LEVEL = {
  Green: CAPACITY_LEVELS.HIGH,
  Amber: CAPACITY_LEVELS.MEDIUM,
  Red: CAPACITY_LEVELS.LOW,
  Blue: CAPACITY_LEVELS.UNAVAILABLE,
};

// "NOT_APPLICABLE" means that axis doesn't apply to this site (e.g. the
// PRI axis on a bulk-only record) rather than "no data" - it's dropped
// rather than mapped to a level.
export function ragToLevel(rag) {
  return RAG_TO_LEVEL[rag] ?? null;
}

const LEVEL_SEVERITY = {
  [CAPACITY_LEVELS.LOW]: 3,
  [CAPACITY_LEVELS.MEDIUM]: 2,
  [CAPACITY_LEVELS.HIGH]: 1,
  [CAPACITY_LEVELS.UNAVAILABLE]: 0,
};

// Worst-of merge across applicable axes (e.g. primary + bulk supply
// point), matching how the source map grades a pin on its weakest link.
// Falls back to "unavailable" only when every axis was inapplicable/blue.
export function worstLevel(levels) {
  const applicable = levels.filter(Boolean);
  if (applicable.length === 0) return CAPACITY_LEVELS.UNAVAILABLE;
  return applicable.reduce((worst, level) =>
    LEVEL_SEVERITY[level] > LEVEL_SEVERITY[worst] ? level : worst
  );
}

// Northern Ireland bounding extent, used to frame the initial MapView.
export const INITIAL_EXTENT = {
  xmin: -8.2,
  ymin: 54.0,
  xmax: -5.4,
  ymax: 55.3,
  spatialReference: { wkid: 4326 },
};
