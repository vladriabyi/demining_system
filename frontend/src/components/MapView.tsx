import { memo } from "react"
import { MapContainer, TileLayer, Circle, CircleMarker, Marker, Popup, useMapEvents } from "react-leaflet"
import L from "leaflet"
// @ts-ignore
import "leaflet/dist/leaflet.css"
import type { DeminingRequest, Territory } from "../types"
import { REQUEST_STATUS, TERRITORY_STATUS, PRIORITY_LABEL } from "./constants"

// Fix default Leaflet icon paths
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

function ClickHandler({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onMapClick?.(e.latlng.lat, e.latlng.lng) } })
  return null
}

interface Props {
  requests?: DeminingRequest[]
  territories?: Territory[]
  onRequestClick?: (r: DeminingRequest) => void
  onMapClick?: (lat: number, lng: number) => void
  selectedCoords?: { lat: number; lng: number } | null
}

/** Перетворює площу (км²) на радіус кола (метри) */
function areaToRadius(area_km2?: number | null): number {
  const area = area_km2 ?? 500
  return Math.sqrt(area / Math.PI) * 1000
}

export default memo(function MapView({
  requests = [],
  territories = [],
  onRequestClick,
  onMapClick,
  selectedCoords,
}: Props) {
  return (
    <MapContainer
      center={[48.5, 32.0]} zoom={6}
      style={{ height: "100%", width: "100%", background: "#080d18" }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
      />
      <ClickHandler onMapClick={onMapClick} />

      {territories.map(t => {
        const cfg = TERRITORY_STATUS[t.status] ?? { color: "#94a3b8", label: t.status }
        return (
          <Circle
            key={`t-${t.id}`}
            center={[t.latitude, t.longitude]}
            radius={areaToRadius(t.area_km2)}
            pathOptions={{ color: cfg.color, fillColor: cfg.color, fillOpacity: 0.15, weight: 2, dashArray: "5 4" }}
          >
            <Popup>
              <p style={{ fontWeight: 700, marginBottom: 4, color: "#f1f5f9" }}>{t.name}</p>
              <p style={{ fontSize: 11, color: cfg.color, marginBottom: 4 }}>{cfg.label}</p>
              {t.description && <p style={{ fontSize: 11, color: "#94a3b8" }}>{t.description}</p>}
              {t.area_km2 != null && <p style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>📐 {t.area_km2} км²</p>}
            </Popup>
          </Circle>
        )
      })}

      {requests.map(r => {
        const cfg  = REQUEST_STATUS[r.status] ?? { color: "#94a3b8", label: r.status }
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:13px;height:13px;background:${cfg.color};border:2px solid rgba(255,255,255,.45);transform:rotate(45deg);cursor:pointer;border-radius:2px;box-shadow:0 2px 8px rgba(0,0,0,.6)"></div>`,
          iconSize: [13, 13],
          iconAnchor: [7, 7],
        })
        return (
          <Marker
            key={`r-${r.id}`}
            position={[r.latitude, r.longitude]}
            icon={icon}
            eventHandlers={{ click: () => onRequestClick?.(r) }}
          >
            <Popup>
              <p style={{ fontWeight: 700, marginBottom: 4, color: "#f1f5f9" }}>{r.title}</p>
              <p style={{ fontSize: 11, color: cfg.color, marginBottom: 2 }}>{cfg.label}</p>
              <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>{r.location_name}</p>
              <p style={{ fontSize: 11, color: "#64748b" }}>Пріоритет: {PRIORITY_LABEL[r.priority]}</p>
              {onRequestClick && (
                <button
                  onClick={() => onRequestClick(r)}
                  style={{ marginTop: 8, fontSize: 11, color: "#fbbf24", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 6, padding: "3px 10px", cursor: "pointer", width: "100%" }}
                >
                  Переглянути →
                </button>
              )}
            </Popup>
          </Marker>
        )
      })}

      {selectedCoords && (
        <CircleMarker
          center={[selectedCoords.lat, selectedCoords.lng]}
          radius={8}
          pathOptions={{ color: "#fbbf24", fillColor: "#fbbf24", fillOpacity: 0.85, weight: 2 }}
        />
      )}
    </MapContainer>
  )
})
