import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase.js';

/**
 * Haversine formula to calculate distance between two lat/lng points.
 * Returns distance in miles.
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 3958.8; // Earth radius in miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Estimate ETA based on distance. Uses average urban driving speed.
 * Returns minutes (integer).
 */
function estimateETA(distanceMiles) {
    // Average 25 mph in urban/suburban areas
    const avgSpeedMph = 25;
    const minutes = (distanceMiles / avgSpeedMph) * 60;
    return Math.max(1, Math.round(minutes));
}

/**
 * Hook for customers to watch a technician's real-time location.
 * Subscribes to Supabase Realtime changes on the tech_locations table.
 *
 * @param {Object} options
 * @param {string} options.repairId - The repair UUID
 * @param {boolean} options.isActive - Whether to watch (true when en_route/arrived)
 * @param {{ lat: number, lng: number }|null} options.customerLocation - Customer's geocoded address
 * @returns {{ techLocation, distance, eta, lastUpdated }}
 */
export function useTechLocationWatch({ repairId, isActive, customerLocation }) {
    const [techLocation, setTechLocation] = useState(null);
    const [distance, setDistance] = useState(null);
    const [eta, setEta] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const channelRef = useRef(null);

    // Compute distance and ETA whenever tech or customer location changes
    useEffect(() => {
        if (techLocation && customerLocation) {
            const dist = haversineDistance(
                techLocation.lat,
                techLocation.lng,
                customerLocation.lat,
                customerLocation.lng
            );
            setDistance(Math.round(dist * 10) / 10); // 1 decimal place
            setEta(estimateETA(dist));
        }
    }, [techLocation, customerLocation]);

    useEffect(() => {
        if (!repairId || !isActive) {
            setTechLocation(null);
            setDistance(null);
            setEta(null);
            setLastUpdated(null);
            return;
        }

        // Fetch initial location
        const fetchInitial = async () => {
            const { data, error } = await supabase
                .from('tech_locations')
                .select('*')
                .eq('repair_id', repairId)
                .single();

            if (!error && data) {
                setTechLocation({ lat: data.latitude, lng: data.longitude });
                setLastUpdated(new Date(data.updated_at));
            }
        };

        fetchInitial();

        // Subscribe to realtime updates
        const channel = supabase
            .channel(`tech-location-${repairId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tech_locations',
                    filter: `repair_id=eq.${repairId}`,
                },
                (payload) => {
                    if (payload.eventType === 'DELETE') {
                        setTechLocation(null);
                        return;
                    }
                    const loc = payload.new;
                    if (loc) {
                        setTechLocation({ lat: loc.latitude, lng: loc.longitude });
                        setLastUpdated(new Date(loc.updated_at));
                    }
                }
            )
            .subscribe();

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [repairId, isActive]);

    return { techLocation, distance, eta, lastUpdated };
}
