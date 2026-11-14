import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const markerIcon = L.divIcon({
  className: 'stay-marker',
  html: '<span class="stay-marker-pin">◈</span>',
  iconSize: [34, 34],
  iconAnchor: [17, 34],
});

export default function MapView({ points = [], zoom = 12, height = 360 }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const key = JSON.stringify(points);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView([20, 78], 3);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 120);
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => map.removeLayer(marker));
    markersRef.current = [];

    const valid = points.filter((p) => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)));
    if (!valid.length) {
      map.setView([20, 78], 3);
      return;
    }

    const bounds = [];
    valid.forEach((p) => {
      const marker = L.marker([Number(p.lat), Number(p.lng)], { icon: markerIcon }).addTo(map);
      if (p.title) {
        marker.bindPopup(
          `<strong>${p.title}</strong>${p.pricePerNight ? `<br/>₹${Number(p.pricePerNight).toLocaleString('en-IN')} / night` : ''}`
        );
      }
      markersRef.current.push(marker);
      bounds.push([Number(p.lat), Number(p.lng)]);
    });

    if (bounds.length === 1) map.setView(bounds[0], zoom);
    else map.fitBounds(bounds, { padding: [40, 40] });
    setTimeout(() => map.invalidateSize(), 80);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, zoom]);

  return <div ref={containerRef} className="map-view" style={{ height }} />;
}
