import { useState } from "react";
import {
  MapContainer,
  TileLayer,
  ImageOverlay,
  CircleMarker,
  Popup,
  Polyline,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
const bounds = [
  [25.4904, 81.864],
  [25.4948, 81.8677],
];
export default function GameMap({
  progress,
  players = [],
  checkpoints = [],
  demoMode,
}) {
  const [online, setOnline] = useState(false);
  const locations = demoMode ? checkpoints : progress?.completed || [];
  return (
    <section className="card map-card">
      <div className="section-title">
        <div>
          <span className="eyebrow">YOUR FIELD NOTES</span>
          <h2>Campus explorer</h2>
        </div>
        <button className="text-button" onClick={() => setOnline(!online)}>
          {online ? "Use offline map" : "Use street tiles"}
        </button>
      </div>
      <div className="map-wrap">
        <MapContainer
          center={[25.49265, 81.86585]}
          zoom={17}
          minZoom={14}
          maxZoom={19}
          scrollWheelZoom={false}
        >
          <ImageOverlay
            url="/campus.svg"
            bounds={bounds}
            attribution="Original schematic · Illustrative coordinates"
          />
          {online && (
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              eventHandlers={{ tileerror: () => setOnline(false) }}
            />
          )}
          {demoMode && locations.length > 1 && (
            <Polyline
              positions={locations.map((c) => [c.latitude, c.longitude])}
              pathOptions={{ color: "#9aaf98", dashArray: "5 9", weight: 3 }}
            />
          )}
          {locations.map((c) => (
            <CircleMarker
              key={c.id}
              center={[c.latitude, c.longitude]}
              radius={10}
              pathOptions={{
                color: "#fff",
                weight: 3,
                fillColor: progress?.completed.some((x) => x.id === c.id)
                  ? "#297955"
                  : "#b87c34",
                fillOpacity: 1,
              }}
            >
              <Popup>
                {c.name}
                {demoMode ? " · Demo checkpoint" : " · Completed"}
              </Popup>
            </CircleMarker>
          ))}
          {players.map((p) => (
            <CircleMarker
              key={p.user_id}
              center={[p.latitude, p.longitude]}
              radius={p.user_id === progress?.user_id ? 9 : 6}
              pathOptions={{
                color: "#fff",
                weight: 3,
                fillColor:
                  p.user_id === progress?.user_id ? "#2563eb" : "#8254a4",
                fillOpacity: 1,
              }}
            >
              <Popup>
                {p.team_name} ·{" "}
                {p.mode === "demo" ? "Simulated location" : "Reported GPS"}
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
        <div className="map-label">
          {online ? "OPENSTREETMAP" : "OFFLINE CAMPUS SCHEMATIC"}
          <small>Illustrative positions · not a navigation survey</small>
        </div>
      </div>
      <div className="map-legend">
        <span>
          <i className="dot blue" />
          You
        </span>
        <span>
          <i className="dot green" />
          Completed
        </span>
        <span>
          <i className="dot purple" />
          Other explorers
        </span>
        <span className="muted">
          {demoMode
            ? "Demo controls reveal destinations"
            : "Solve clues to discover destinations"}
        </span>
      </div>
    </section>
  );
}
