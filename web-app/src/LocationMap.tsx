import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const markerIcon = L.icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

type LocationPoint = {
  latitude: number;
  longitude: number;
  altitude: number | null;
  speed: number | null;
  course: number | null;
  observedAt: string;
};

type LocationMapProps = {
  trackerId: string;
  hours?: number;
};

function LocationMap({ trackerId, hours = 48 }: LocationMapProps) {
  const [points, setPoints] = useState<LocationPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/dashboard/trackers/${encodeURIComponent(trackerId)}/locations?hours=${hours}`,
        );
        if (!response.ok) {
          throw new Error("Location history request failed");
        }
        const payload = (await response.json()) as LocationPoint[];
        if (!cancelled) {
          setPoints(payload);
        }
      } catch (requestError) {
        if (!cancelled) {
          const message =
            requestError instanceof Error
              ? requestError.message
              : "Unknown location history error";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [trackerId, hours]);

  const path = useMemo(
    () => points.map((point) => [point.latitude, point.longitude] as [number, number]),
    [points],
  );

  const latestPoint = points.length > 0 ? points[points.length - 1] : null;
  const center = latestPoint
    ? [latestPoint.latitude, latestPoint.longitude]
    : path[0] ?? [0, 0];

  if (loading) {
    return <p className="empty-state">Loading location history…</p>;
  }

  if (error) {
    return <div className="error-banner">Failed to load map: {error}</div>;
  }

  if (points.length === 0) {
    return <p className="empty-state">No location history in the past {hours}h.</p>;
  }

  return (
    <MapContainer
      center={center as [number, number]}
      zoom={15}
      style={{ height: "100%", width: "100%", minHeight: 320 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polyline positions={path} pathOptions={{ color: "#2563eb", weight: 3 }} />
      {latestPoint ? (
        <Marker
          position={[latestPoint.latitude, latestPoint.longitude]}
          icon={markerIcon}
        >
          <Popup>
            Last seen {new Date(latestPoint.observedAt).toLocaleString()}
          </Popup>
        </Marker>
      ) : null}
    </MapContainer>
  );
}

export default LocationMap;
