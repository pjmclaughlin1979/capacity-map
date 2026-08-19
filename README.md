# Network Capacity Map (scaffold)

A React + Vite scaffold for a distribution-network capacity map, built on
**ArcGIS Maps SDK for JavaScript 5.1** (`@arcgis/core` + the new
`@arcgis/map-components` web components, replacing the deprecated widget
classes).

Modelled on the feature set of [NIE Networks' Capacity Map](https://www.nienetworks.co.uk/connections/capacity-map):
substation pins colour-coded by available headroom, a Demand / Generation /
Fault Level mode switch, substation-type and capacity-level filters, a
postcode/address search, two-colour "split pins" for combined/dual-primary
sites, and a per-substation popup with the full demand/generation/fault-level
breakdown.

## Data

Live data comes from NIE Networks' public ArcGIS Feature Service
(`src/data/loadSubstations.js`) — read-only, anonymous query. If that
service is unreachable, the app falls back to `src/data/sampleSubstations.js`,
which is **placeholder data only**: fictional substation names, coordinates
and MVA figures shaped to match the live schema, not real network data.

Pin shape: most rows render as a single-colour pin. Two shapes in the source
data are merged into a two-colour "split pin" by `groupIntoPins()` in
`src/hooks/useCapacityMap.js`:
- `Type = "CSP"` (`ESRI_split_pin = "S"`): a combined Bulk Supply Point +
  Primary site on one row — left half grades the BSP axis, right half the
  Primary axis.
- A pair of `Type = "PRI"` rows sharing exact coordinates, marked
  `ESRI_split_pin` `"L"`/`"R"` (a dual-primary site, e.g. 33/11kV +
  33/6.6kV at one location) — each half grades its own row.

## Not yet implemented

- Spreadsheet export.
- Postcode-only search (currently uses Esri's general address/place geocoder
  via `<arcgis-search>`, not restricted to NI postcodes).

## Getting started

```bash
npm install
npm run dev
```
