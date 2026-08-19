// Live data source: NIE Networks' public ArcGIS Feature Service backing
// their network capacity map (anonymous query enabled). Read-only —
// this app never issues edit/add/delete requests against it.
const FEATURE_SERVICE_URL =
  "https://services.arcgis.com/pMnvm7HXxTmNXxGi/arcgis/rest/services/____________________4bb4xZ/FeatureServer/0";

const TYPE_TO_SUBSTATION_TYPE = {
  BSP: "bulk",
  PRI: "primary",
  CSP: "combined",
};

function parseNum(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? Math.round(raw * 100) / 100 : null;
  const trimmed = String(raw).trim();
  if (trimmed === "" || trimmed === "NOT_APPLICABLE") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

function cleanText(raw) {
  if (raw === null || raw === undefined) return "";
  const trimmed = String(raw).trim();
  return trimmed === "NOT_APPLICABLE" ? "" : trimmed;
}

function toSubstation(attributes, geometry) {
  const a = attributes;
  return {
    objectId: a.objectId,
    name: cleanText(a.Name) || `Substation ${a.objectId}`,
    substationType: TYPE_TO_SUBSTATION_TYPE[a.Type] ?? "primary",
    splitPin: a.ESRI_split_pin ?? "N",
    voltageDomainPri: cleanText(a.Voltage_Domain_PRI),
    voltageDomainBsp: cleanText(a.Voltage_Domain_BSP),
    bulkSupplyPoint: cleanText(a.Bulk_Supply_Point),
    longitude: geometry?.x ?? a.Longitude,
    latitude: geometry?.y ?? a.Latitude,
    demand: {
      pri: { headroom: parseNum(a.Demand_Headroom_PRI), rag: a.Demand_Headroom_RAG_PRI },
      net: { headroom: parseNum(a.Demand_Headroom_NET) },
      bsp: { headroom: parseNum(a.Demand_Headroom_BSP), rag: a.Demand_Headroom_RAG_BSP },
      comment: cleanText(a.Demand_Comment),
    },
    generation: {
      pri: {
        headroom: parseNum(a.Generation_Headroom_PRI),
        rag: a.Generation_Headroom_RAG_PRI,
        capacity: parseNum(a.Generation_Capacity_PRI),
        connected: parseNum(a.Generation_Connected_PRI),
        committed: parseNum(a.Generation_Committed_PRI),
      },
      net: { headroom: parseNum(a.Generation_Headroom_NET), capacity: parseNum(a.Generation_Capacity_NET) },
      bsp: {
        headroom: parseNum(a.Generation_Headroom_BSP),
        rag: a.Generation_Headroom_RAG_BSP,
        capacity: parseNum(a.Generation_Capacity_BSP),
        connected: parseNum(a.Generation_Connected_BSP),
        committed: parseNum(a.Generation_Committed_BSP),
      },
      comment: cleanText(a.Generation_Comment),
      reversePowerCapable: cleanText(a.Reverse_Power_Capable),
    },
    faultLevel: {
      pri: { headroom: parseNum(a.Fault_Headroom_PRI), rag: a.Fault_Headroom_RAG_PRI },
      net: { headroom: parseNum(a.Fault_Headroom_NET) },
      bsp: { headroom: parseNum(a.Fault_Headroom_BSP), rag: a.Fault_Headroom_RAG_BSP },
      comment: cleanText(a.Fault_Comment),
    },
    otherComment: cleanText(a.Other_Comment),
  };
}

export async function loadSubstations({ signal } = {}) {
  const url = `${FEATURE_SERVICE_URL}/query?where=1%3D1&outFields=*&returnGeometry=true&f=json`;
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Feature service query failed: HTTP ${response.status}`);
  }
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message ?? "Feature service returned an error");
  }
  return data.features
    .filter((f) => Number.isFinite(f.geometry?.x) && Number.isFinite(f.geometry?.y))
    .map((f) => toSubstation(f.attributes, f.geometry));
}
