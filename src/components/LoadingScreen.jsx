import "./LoadingScreen.css";

export default function LoadingScreen({ status, error }) {
  const isError = status === "error";

  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="loading-screen__mark" aria-hidden="true">
        <span className="loading-screen__ring" />
        <span className="loading-screen__dot" />
      </div>

      <p className="loading-screen__brand">Network Capacity Map</p>

      {isError ? (
        <p className="loading-screen__message loading-screen__message--error">
          {error ?? "The map failed to load."}
        </p>
      ) : (
        <p className="loading-screen__message">Loading the network capacity map&hellip;</p>
      )}
    </div>
  );
}
