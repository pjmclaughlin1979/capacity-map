import { useMemo, useRef, useState } from "react";
import "@arcgis/map-components/components/arcgis-map";
import "@arcgis/map-components/components/arcgis-home";
import "@arcgis/map-components/components/arcgis-zoom";
import "@arcgis/map-components/components/arcgis-search";
import "@arcgis/map-components/components/arcgis-fullscreen";
import "@arcgis/map-components/components/arcgis-expand";
import "@arcgis/map-components/components/arcgis-basemap-gallery";
import { useCapacityMap } from "./hooks/useCapacityMap.js";
import { CAPACITY_LEVELS, CAPACITY_MODES, SUBSTATION_TYPES } from "./config/capacityConfig.js";
import FilterPanel from "./components/FilterPanel.jsx";
import InfoModal from "./components/InfoModal.jsx";
import KeyContent from "./components/KeyContent.jsx";
import FaqContent from "./components/FaqContent.jsx";
import LoadingScreen from "./components/LoadingScreen.jsx";
import DisclaimerModal from "./components/DisclaimerModal.jsx";
import NieHeader from "./components/NieHeader.jsx";
import NieFooter from "./components/NieFooter.jsx";
import SidePanel from "./components/SidePanel.jsx";
import "./App.css";

export default function NieStyleApp() {
  const mapElementRef = useRef(null);

  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [mode, setMode] = useState(CAPACITY_MODES.DEMAND);
  const [substationTypes, setSubstationTypes] = useState(
    () => new Set(Object.values(SUBSTATION_TYPES))
  );
  const [levels, setLevels] = useState(() => new Set(Object.values(CAPACITY_LEVELS)));
  const [openModal, setOpenModal] = useState(null); // null | "key" | "faq"
  const [filtersVisible, setFiltersVisible] = useState(true);

  const filters = useMemo(
    () => ({ mode, substationTypes, levels }),
    [mode, substationTypes, levels]
  );

  const { status, error, usingSampleData, sidePanel, closeSidePanel } = useCapacityMap(
    mapElementRef,
    filters
  );

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
    <div className="app app--niestyle">
      <NieHeader
        onOpenKey={() => setOpenModal("key")}
        onOpenFaq={() => setOpenModal("faq")}
        filtersVisible={filtersVisible}
        onToggleFilters={() => setFiltersVisible((prev) => !prev)}
      />

      <div className={`nie-filters-collapse ${filtersVisible ? "" : "nie-filters-collapse--closed"}`}>
        <div className="nie-filters-collapse__inner">
          <FilterPanel
            mode={mode}
            onModeChange={setMode}
            substationTypes={substationTypes}
            onToggleType={toggleType}
            levels={levels}
            onToggleLevel={toggleLevel}
            showActions={false}
          />
        </div>
      </div>

      <div className="app__map-container">
        <arcgis-map ref={mapElementRef} basemap="topo-vector">
          <arcgis-home slot="top-left" />
          <arcgis-zoom slot="top-left" />
          <arcgis-fullscreen slot="top-left" />
          <arcgis-search slot="top-right" />
          <arcgis-expand slot="bottom-left">
            <arcgis-basemap-gallery />
          </arcgis-expand>
        </arcgis-map>

        {status !== "ready" && <LoadingScreen status={status} error={error} />}
        {status === "ready" && usingSampleData && (
          <div className="app__sample-banner" role="status">
            Live feature service unreachable — showing bundled sample data.
          </div>
        )}

        {sidePanel && (
          <SidePanel key={sidePanel.title} title={sidePanel.title} html={sidePanel.html} onClose={closeSidePanel} />
        )}
      </div>

      <NieFooter onOpenKey={() => setOpenModal("key")} onOpenFaq={() => setOpenModal("faq")} />

      <InfoModal title="Key" isOpen={openModal === "key"} onClose={() => setOpenModal(null)}>
        <KeyContent />
      </InfoModal>

      <InfoModal title="Capacity Map FAQs" isOpen={openModal === "faq"} onClose={() => setOpenModal(null)}>
        <FaqContent />
      </InfoModal>

      {!disclaimerAccepted && <DisclaimerModal onAccept={() => setDisclaimerAccepted(true)} />}
    </div>
  );
}
