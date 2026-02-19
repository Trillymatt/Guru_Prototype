import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabase.js';

/**
 * Hook for technicians to broadcast their GPS location to Supabase
 * during en_route status. Uses navigator.geolocation.watchPosition
 * for continuous high-accuracy tracking.
 *
 * @param {Object} options
 * @param {string} options.repairId - The repair UUID
 * @param {string} options.technicianId - The technician's user UUID
 * @param {boolean} options.isActive - Whether to broadcast (true when en_route)
 * @returns {{ isSharing, error, position, requestPermission, stopSharing }}
 */
export function useLocationBroadcast({ repairId, technicianId, isActive }) {
    const [isSharing, setIsSharing] = useState(false);
    const [error, setError] = useState(null);
    const [position, setPosition] = useState(null);
    const [permissionState, setPermissionState] = useState('prompt'); // prompt | granted | denied
    const watchIdRef = useRef(null);
    const updateIntervalRef = useRef(null);
    const latestPositionRef = useRef(null);

    // Check permission state on mount
    useEffect(() => {
        if (navigator.permissions) {
            navigator.permissions.query({ name: 'geolocation' }).then((result) => {
                setPermissionState(result.state);
                result.addEventListener('change', () => {
                    setPermissionState(result.state);
                });
            }).catch(() => {
                // Permissions API not supported, will check on request
            });
        }
    }, []);

    // Push latest position to Supabase
    const pushLocation = useCallback(async (pos) => {
        if (!repairId || !technicianId || !pos) return;

        const locationData = {
            repair_id: repairId,
            technician_id: technicianId,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            accuracy: pos.coords.accuracy,
            updated_at: new Date().toISOString(),
        };

        const { error: upsertError } = await supabase
            .from('tech_locations')
            .upsert(locationData, { onConflict: 'repair_id' });

        if (upsertError) {
            console.error('Location push failed:', upsertError.message);
        }
    }, [repairId, technicianId]);

    // Start watching position
    const startWatching = useCallback(() => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by this browser.');
            return;
        }

        setError(null);
        setIsSharing(true);

        // Watch position with high accuracy for driving
        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                latestPositionRef.current = pos;
                setPosition({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                    heading: pos.coords.heading,
                    speed: pos.coords.speed,
                });
            },
            (err) => {
                console.error('Geolocation error:', err.message);
                if (err.code === 1) {
                    setError('Location permission denied. Please enable location access.');
                    setPermissionState('denied');
                    setIsSharing(false);
                } else if (err.code === 2) {
                    setError('Unable to determine location. Please check GPS settings.');
                } else {
                    setError('Location request timed out. Retrying...');
                }
            },
            {
                enableHighAccuracy: true,
                maximumAge: 5000,
                timeout: 15000,
            }
        );

        // Push to Supabase every 8 seconds
        updateIntervalRef.current = setInterval(() => {
            if (latestPositionRef.current) {
                pushLocation(latestPositionRef.current);
            }
        }, 8000);

        // Push the first one immediately after getting it
        const initialPush = setInterval(() => {
            if (latestPositionRef.current) {
                pushLocation(latestPositionRef.current);
                clearInterval(initialPush);
            }
        }, 500);

        // Cleanup initial push after 10s max
        setTimeout(() => clearInterval(initialPush), 10000);
    }, [pushLocation]);

    // Stop watching
    const stopWatching = useCallback(() => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        if (updateIntervalRef.current) {
            clearInterval(updateIntervalRef.current);
            updateIntervalRef.current = null;
        }
        setIsSharing(false);
        latestPositionRef.current = null;
    }, []);

    // Clean up location record from DB
    const cleanupLocation = useCallback(async () => {
        if (!repairId || !technicianId) return;
        await supabase
            .from('tech_locations')
            .delete()
            .eq('repair_id', repairId)
            .eq('technician_id', technicianId);
    }, [repairId, technicianId]);

    // Request permission and start sharing
    const requestPermission = useCallback(() => {
        // This will trigger the browser permission prompt
        navigator.geolocation.getCurrentPosition(
            () => {
                setPermissionState('granted');
                startWatching();
            },
            (err) => {
                if (err.code === 1) {
                    setPermissionState('denied');
                    setError('Location permission denied. Please enable location in your browser settings.');
                } else {
                    // Permission granted but position error - still start watching
                    startWatching();
                }
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }, [startWatching]);

    // Stop sharing explicitly
    const stopSharing = useCallback(() => {
        stopWatching();
        cleanupLocation();
    }, [stopWatching, cleanupLocation]);

    // Auto-start/stop based on isActive
    useEffect(() => {
        if (isActive && permissionState === 'granted' && !isSharing) {
            startWatching();
        } else if (!isActive && isSharing) {
            stopWatching();
            cleanupLocation();
        }
    }, [isActive, permissionState]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopWatching();
        };
    }, [stopWatching]);

    return {
        isSharing,
        error,
        position,
        permissionState,
        requestPermission,
        stopSharing,
    };
}
