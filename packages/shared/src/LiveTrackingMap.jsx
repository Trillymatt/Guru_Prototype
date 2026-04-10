import React, { useEffect, useRef, useState } from 'react';

// Default center when no customer location is provided (Dallas, TX)
const DEFAULT_CENTER = { lat: 32.7767, lng: -96.7970 };

/**
 * Live tracking map component using Leaflet.js.
 * Shows customer location and technician location with a route line.
 *
 * @param {Object} props
 * @param {{ lat: number, lng: number }|null} props.customerLocation
 * @param {{ lat: number, lng: number }|null} props.techLocation
 * @param {number|null} props.eta - Estimated minutes until arrival
 * @param {number|null} props.distance - Distance in miles
 * @param {boolean} props.isArrived - Whether tech has arrived
 * @param {string} props.customerAddress - Display address text
 */
export default function LiveTrackingMap({
    customerLocation,
    techLocation,
    eta,
    distance,
    isArrived,
    customerAddress,
}) {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const customerMarkerRef = useRef(null);
    const techMarkerRef = useRef(null);
    const routeLineRef = useRef(null);
    const [leaflet, setLeaflet] = useState(null);
    const [mapReady, setMapReady] = useState(false);

    // Dynamically import Leaflet (only available in customer portal)
    useEffect(() => {
        let cancelled = false;
        async function loadLeaflet() {
            try {
                const L = await import('leaflet');
                if (!cancelled) setLeaflet(L.default || L);
            } catch {
                // Leaflet not installed (technician portal) - no-op
            }
        }
        loadLeaflet();
        return () => { cancelled = true; };
    }, []);

    // Initialize map
    useEffect(() => {
        if (!leaflet || !mapContainerRef.current || mapRef.current) return;

        try {
            const center = customerLocation || DEFAULT_CENTER;

            const map = leaflet.map(mapContainerRef.current, {
                center: [center.lat, center.lng],
                zoom: 14,
                zoomControl: true,
                attributionControl: true,
                scrollWheelZoom: true,
            });

            leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 19,
            }).addTo(map);

            mapRef.current = map;
            setMapReady(true);
        } catch {
            // Leaflet initialization failed — component stays in loading state
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                setMapReady(false);
            }
        };
    }, [leaflet]);

    // Customer marker
    useEffect(() => {
        if (!mapReady || !leaflet || !mapRef.current || !customerLocation) return;
        if (customerLocation.lat == null || customerLocation.lng == null) return;

        const customerIcon = leaflet.divIcon({
            className: 'lt-marker lt-marker--customer',
            html: `<div class="lt-marker__inner lt-marker__inner--customer">
                <span class="lt-marker__icon">📍</span>
                <div class="lt-marker__ring"></div>
            </div>`,
            iconSize: [48, 48],
            iconAnchor: [24, 24],
        });

        if (customerMarkerRef.current) {
            customerMarkerRef.current.setLatLng([customerLocation.lat, customerLocation.lng]);
        } else {
            customerMarkerRef.current = leaflet
                .marker([customerLocation.lat, customerLocation.lng], { icon: customerIcon })
                .addTo(mapRef.current)
                .bindPopup(
                    `<div class="lt-popup"><strong>Repair Location</strong><br/>${customerAddress || 'Your location'}</div>`,
                    { className: 'lt-popup-container' }
                );
        }
    }, [mapReady, leaflet, customerLocation, customerAddress]);

    // Technician marker
    useEffect(() => {
        if (!mapReady || !leaflet || !mapRef.current || !techLocation) return;
        if (techLocation.lat == null || techLocation.lng == null) return;

        const techIcon = leaflet.divIcon({
            className: 'lt-marker lt-marker--tech',
            html: `<div class="lt-marker__inner lt-marker__inner--tech">
                <span class="lt-marker__icon">${isArrived ? '🔧' : '🚗'}</span>
                <div class="lt-marker__pulse"></div>
            </div>`,
            iconSize: [48, 48],
            iconAnchor: [24, 24],
        });

        if (techMarkerRef.current) {
            // Smooth transition to new position
            techMarkerRef.current.setLatLng([techLocation.lat, techLocation.lng]);
            techMarkerRef.current.setIcon(techIcon);
        } else {
            techMarkerRef.current = leaflet
                .marker([techLocation.lat, techLocation.lng], {
                    icon: techIcon,
                    zIndexOffset: 1000,
                })
                .addTo(mapRef.current)
                .bindPopup(
                    `<div class="lt-popup"><strong>Your Technician</strong><br/>${isArrived ? 'Has arrived!' : 'On the way'}</div>`,
                    { className: 'lt-popup-container' }
                );
        }
    }, [mapReady, leaflet, techLocation, isArrived]);

    // Route line between tech and customer
    useEffect(() => {
        if (!mapReady || !leaflet || !mapRef.current) return;

        // Remove old line
        if (routeLineRef.current) {
            mapRef.current.removeLayer(routeLineRef.current);
            routeLineRef.current = null;
        }

        if (techLocation && customerLocation && !isArrived) {
            routeLineRef.current = leaflet.polyline(
                [
                    [techLocation.lat, techLocation.lng],
                    [customerLocation.lat, customerLocation.lng],
                ],
                {
                    color: '#7C3AED',
                    weight: 3,
                    opacity: 0.7,
                    dashArray: '10 8',
                    lineCap: 'round',
                }
            ).addTo(mapRef.current);
        }
    }, [mapReady, leaflet, techLocation, customerLocation, isArrived]);

    // Fit bounds when both markers exist
    useEffect(() => {
        if (!mapReady || !leaflet || !mapRef.current) return;
        if (!customerLocation) return;

        if (techLocation && customerLocation) {
            const bounds = leaflet.latLngBounds(
                [techLocation.lat, techLocation.lng],
                [customerLocation.lat, customerLocation.lng]
            );
            mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
        } else if (customerLocation) {
            mapRef.current.setView([customerLocation.lat, customerLocation.lng], 14);
        }
    }, [mapReady, leaflet, techLocation, customerLocation]);

    // Cleanup markers/lines on unmount
    useEffect(() => {
        return () => {
            if (customerMarkerRef.current && mapRef.current) {
                mapRef.current.removeLayer(customerMarkerRef.current);
            }
            if (techMarkerRef.current && mapRef.current) {
                mapRef.current.removeLayer(techMarkerRef.current);
            }
            if (routeLineRef.current && mapRef.current) {
                mapRef.current.removeLayer(routeLineRef.current);
            }
            customerMarkerRef.current = null;
            techMarkerRef.current = null;
            routeLineRef.current = null;
        };
    }, []);

    return (
        <div className="lt-wrapper">
            <div ref={mapContainerRef} className="lt-map" />
            {!leaflet && (
                <div className="lt-map lt-map--fallback">
                    <div className="lt-fallback-text">Loading map...</div>
                </div>
            )}
        </div>
    );
}
