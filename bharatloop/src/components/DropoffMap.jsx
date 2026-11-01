import React, { useEffect, useState, useRef } from "react";
import { MapPin, Navigation, Clock, Route, Locate, X, Compass, ExternalLink } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Haversine distance calculation in kilometers
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
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

export default function DropoffMap({ dropoff, allCenters = [], onSelectCenter, onClose }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [isLocating, setIsLocating] = useState(true);

  // Active collection center coordinates (defaults to Bengaluru center)
  const centerLat = dropoff?.coords?.lat ?? dropoff?.lat ?? 12.9716;
  const centerLng = dropoff?.coords?.lng ?? dropoff?.lon ?? 77.5946;

  // Request user Geolocation on mount
  useEffect(() => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          const dist = calculateHaversineDistance(loc.lat, loc.lng, centerLat, centerLng);
          setDistance(dist);
          const estMinutes = Math.max(2, Math.round((dist / 22) * 60)); // ~22 km/h city average
          setDuration(estMinutes);
          setIsLocating(false);
        },
        () => {
          setLocationError("Location access unavailable. Showing standard route from central Bengaluru.");
          // Default to Bengaluru Vidhana Soudha for demonstration
          const fallbackLoc = { lat: 12.9797, lng: 77.5907 };
          setUserLocation(fallbackLoc);
          const dist = calculateHaversineDistance(fallbackLoc.lat, fallbackLoc.lng, centerLat, centerLng);
          setDistance(dist);
          setDuration(Math.max(3, Math.round((dist / 22) * 60)));
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    } else {
      setLocationError("Geolocation not supported by this browser.");
      const fallbackLoc = { lat: 12.9797, lng: 77.5907 };
      setUserLocation(fallbackLoc);
      const dist = calculateHaversineDistance(fallbackLoc.lat, fallbackLoc.lng, centerLat, centerLng);
      setDistance(dist);
      setDuration(Math.max(3, Math.round((dist / 22) * 60)));
      setIsLocating(false);
    }
  }, [centerLat, centerLng]);

  // Initialize and update Leaflet map
  useEffect(() => {
    if (isLocating || !mapRef.current) return;

    // Clean up existing map instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true,
    });
    mapInstanceRef.current = map;

    // High quality OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Custom Collection Center Marker (Terracotta with SVG icon)
    const centerIcon = L.divIcon({
      className: "custom-center-marker",
      html: `
        <div style="
          width: 36px; height: 36px; border-radius: 50%;
          background: linear-gradient(135deg, #BD632F, #a85527);
          border: 3px solid #ffffff; box-shadow: 0 4px 14px rgba(189, 99, 47, 0.45);
          display: flex; align-items: center; justify-content: center;
          color: white;
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5"/>
            <path d="M11 19h8.2a1.8 1.8 0 0 0 1.558-.89 1.78 1.78 0 0 0-.008-1.782l-3.95-6.828"/>
            <path d="m14 12 3-6-6-3"/>
          </svg>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    const marker = L.marker([centerLat, centerLng], { icon: centerIcon })
      .addTo(map)
      .bindPopup(
        `<div style="font-family: inherit; font-size: 13px; line-height: 1.4; padding: 2px;">
          <strong style="color: #273E47; font-size: 14px;">${dropoff?.name || "Intake Center"}</strong><br/>
          <span style="color: #355070; font-size: 11px;">Facility: ${dropoff?.type || "BBMP DWCC"}</span><br/>
          <span style="color: #BD632F; font-weight: 600; font-size: 11px;">Accepts: ${String(dropoff?.accepts || "PET, Aluminium, Glass").replace(/Paper\/Cardboard/gi, "Paper & Cardboard").replace(/\|/g, ", ")}</span>
        </div>`
      );

    // If other centers provided, plot them with subtle secondary pins
    if (allCenters && allCenters.length > 0) {
      allCenters.forEach((c) => {
        const cLat = c.lat ?? c.coords?.lat;
        const cLng = c.lon ?? c.lng ?? c.coords?.lng;
        if (!cLat || !cLng) return;
        if (Math.abs(cLat - centerLat) < 0.0001 && Math.abs(cLng - centerLng) < 0.0001) return; // Skip primary

        const secondaryIcon = L.divIcon({
          className: "custom-secondary-marker",
          html: `
            <div style="
              width: 24px; height: 24px; border-radius: 50%;
              background: #355070; border: 2px solid #ffffff;
              box-shadow: 0 2px 8px rgba(39,62,71,0.25);
              display: flex; align-items: center; justify-content: center;
              color: white; opacity: 0.9; cursor: pointer;
            ">
              <div style="width: 8px; height: 8px; border-radius: 50%; background: #ffffff;"></div>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const secMarker = L.marker([cLat, cLng], { icon: secondaryIcon }).addTo(map);
        secMarker.bindPopup(
          `<div style="font-family: inherit; font-size: 12px; line-height: 1.3;">
            <strong style="color: #273E47;">${c.name}</strong><br/>
            <span style="color: #355070; font-size: 11px;">${c.type || "Collection Point"}</span>
          </div>`
        );
        if (onSelectCenter) {
          secMarker.on("click", () => onSelectCenter(c));
        }
      });
    }

    if (userLocation) {
      // Custom User Location Pin with radar pulse effect
      const userIcon = L.divIcon({
        className: "custom-user-marker",
        html: `
          <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
            <div style="
              position: absolute; width: 28px; height: 28px; border-radius: 50%;
              background: rgba(53, 80, 112, 0.25); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
            <div style="
              width: 20px; height: 20px; border-radius: 50%;
              background: #355070; border: 3px solid #ffffff;
              box-shadow: 0 2px 10px rgba(53, 80, 112, 0.5);
            "></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup(
          `<div style="font-family: inherit; font-size: 12px; padding: 2px;">
            <strong style="color: #273E47;">Your Current Location</strong><br/>
            <span style="color: #355070; font-size: 11px;">GPS Anchor</span>
          </div>`
        );

      // Draw dashed trajectory route connecting user to center
      L.polyline(
        [
          [userLocation.lat, userLocation.lng],
          [centerLat, centerLng],
        ],
        {
          color: "#BD632F",
          weight: 3.5,
          opacity: 0.85,
          dashArray: "6, 8",
        }
      ).addTo(map);

      // Fit bounds to display both points with comfortable padding
      const bounds = L.latLngBounds(
        [userLocation.lat, userLocation.lng],
        [centerLat, centerLng]
      );
      map.fitBounds(bounds, { padding: [55, 55], maxZoom: 16 });
    } else {
      map.setView([centerLat, centerLng], 14);
    }

    marker.openPopup();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isLocating, centerLat, centerLng, userLocation, allCenters]);

  const handleGetDirections = () => {
    const destStr = `${centerLat},${centerLng}`;
    const originStr = userLocation ? `${userLocation.lat},${userLocation.lng}` : "";
    const url = originStr
      ? `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destStr}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&destination=${destStr}&travelmode=driving`;
    window.open(url, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#273E47]/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-[#FAF8F5] shadow-2xl border border-[#E5DEC9] flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5DEC9] px-6 py-4.5 bg-[#FAF8F5]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#273E47] text-[#D8973C] shadow-sm">
              <MapPin size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#273E47] leading-tight">
                  {dropoff?.name || "Authorized Intake Center"}
                </h3>
                <span className="rounded-full bg-[#D8C99B]/30 border border-[#D8C99B] px-2 py-0.5 text-[10px] font-bold text-[#BD632F]">
                  {dropoff?.type || "DWCC"}
                </span>
              </div>
              <p className="text-xs text-[#355070] mt-0.5">
                {dropoff?.address || dropoff?.routing_source || "BBMP Authorized Deposit-Return Point"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-[#EFEAE1] p-2 text-[#355070] hover:bg-[#E0D7C6] hover:text-[#273E47] transition cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Real distance & travel metrics stats bar */}
        <div className="grid grid-cols-3 divide-x divide-[#E5DEC9] border-b border-[#E5DEC9] bg-[#FAF8F5]/80">
          <div className="px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#355070] mb-0.5">
              <Route size={14} className="text-[#BD632F]" />
              <span>Real Distance</span>
            </div>
            <div className="text-xl font-extrabold text-[#273E47]">
              {distance !== null ? `${distance.toFixed(1)} km` : "Calculating..."}
            </div>
            <div className="text-[10px] font-medium text-[#BD632F]">
              {userLocation ? "From current location" : "Bengaluru Central"}
            </div>
          </div>

          <div className="px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#355070] mb-0.5">
              <Clock size={14} className="text-[#355070]" />
              <span>Travel Time</span>
            </div>
            <div className="text-xl font-extrabold text-[#273E47]">
              {duration !== null ? `~${duration} min` : "Calculating..."}
            </div>
            <div className="text-[10px] text-[#355070]">Normal city traffic</div>
          </div>

          <div className="px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#355070] mb-0.5">
              <Locate size={14} className="text-[#D8973C]" />
              <span>Intake Materials</span>
            </div>
            <div className="text-xs font-bold text-[#273E47] truncate px-2 mt-1">
              {String(dropoff?.accepts || "PET, Aluminium, Glass").replace(/Paper\/Cardboard/gi, "Paper & Cardboard").replace(/\|/g, ", ")}
            </div>
            <div className="text-[10px] font-medium text-[#BD632F]">Active & Ready</div>
          </div>
        </div>

        {/* Interactive OpenStreetMap Container */}
        <div className="relative flex-1 min-h-[300px]">
          {isLocating && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#FAF8F5]/90 backdrop-blur-sm">
              <div className="text-center">
                <div className="h-9 w-9 rounded-full border-3 border-[#BD632F] border-t-transparent animate-spin mx-auto mb-2" />
                <p className="text-xs font-semibold text-[#273E47]">Acquiring current GPS location...</p>
                <p className="text-[11px] text-[#355070] mt-0.5">Calculating live routing trajectory</p>
              </div>
            </div>
          )}
          <div
            ref={mapRef}
            className="h-full w-full"
            style={{ minHeight: "320px" }}
          />
        </div>

        {locationError && (
          <div className="px-5 py-2 text-xs text-[#BD632F] bg-[#FAF8F5] border-t border-[#E5DEC9] flex items-center gap-2">
            <Compass size={14} className="shrink-0 text-[#BD632F]" />
            <span>{locationError}</span>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-[#E5DEC9] bg-[#FAF8F5]">
          <button
            onClick={handleGetDirections}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#BD632F] hover:bg-[#a85527] py-3 px-4 text-sm font-bold text-white shadow-xs transition active:scale-[0.98] cursor-pointer"
          >
            <Navigation size={17} />
            <span>Turn-by-Turn Navigation (Google Maps)</span>
            <ExternalLink size={14} className="opacity-70 ml-1" />
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border border-[#E5DEC9] bg-[#EFEAE1] px-5 py-3 text-sm font-semibold text-[#273E47] hover:bg-[#E0D7C6] transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
