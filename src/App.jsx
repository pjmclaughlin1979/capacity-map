import { useMemo, useRef, useState } from "react";
import "@arcgis/map-components/components/arcgis-map";
import "@arcgis/map-components/components/arcgis-zoom";
import "@arcgis/map-components/components/arcgis-search";
import { useCapacityMap } from "./hooks/useCapacityMap.js";
import { CAPACITY_LEVELS, CAPACITY_MODES, SUBSTATION_TYPES } from "./config/capacityConfig.js";
import FilterPanel from "./components/FilterPanel.jsx";
import InfoModal from "./components/InfoModal.jsx";
import KeyContent from "./components/KeyContent.jsx";
import FaqContent from "./components/FaqContent.jsx";
import LoadingScreen from "./components/LoadingScreen.jsx";
import "./App.css";

export default function App() {
  const mapElementRef = useRef(null);

  const [mode, setMode] = useState(CAPACITY_MODES.DEMAND);
  const [substationTypes, setSubstationTypes] = useState(
    () => new Set(Object.values(SUBSTATION_TYPES))
  );
  const [levels, setLevels] = useState(() => new Set(Object.values(CAPACITY_LEVELS)));
  const [openModal, setOpenModal] = useState(null); // null | "key" | "faq"

  const filters = useMemo(
    () => ({ mode, substationTypes, levels }),
    [mode, substationTypes, levels]
  );

  const { status, error, usingSampleData } = useCapacityMap(mapElementRef, filters);

  function toggleType(type) {
    setSubstationTypes((prev) => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  }

  function toggleLevel(level) {
    setLevels((prev) => {
      const next = new Set(prev);
      next.has(level) ? next.delete(level) : next.add(level);
      return next;
    });
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1>Network Capacity Map</h1>
      </header>

      <FilterPanel
        mode={mode}
        onModeChange={setMode}
        substationTypes={substationTypes}
        onToggleType={toggleType}
        levels={levels}
        onToggleLevel={toggleLevel}
        onOpenKey={() => setOpenModal("key")}
        onOpenFaq={() => setOpenModal("faq")}
      />

      <div className="app__map-container">
        <arcgis-map ref={mapElementRef} basemap="topo-vector">
          <arcgis-zoom slot="top-left" />
          <arcgis-search slot="top-right" />
        </arcgis-map>

        {status !== "ready" && <LoadingScreen status={status} error={error} />}
        {status === "ready" && usingSampleData && (
          <div className="app__sample-banner" role="status">
            Live feature service unreachable — showing bundled sample data.
          </div>
        )}
      </div>

      <InfoModal title="Key" isOpen={openModal === "key"} onClose={() => setOpenModal(null)}>
        <KeyContent />
      </InfoModal>

      <InfoModal title="Capacity Map FAQs" isOpen={openModal === "faq"} onClose={() => setOpenModal(null)}>
        <FaqContent />
      </InfoModal>
    </div>
  );
}
