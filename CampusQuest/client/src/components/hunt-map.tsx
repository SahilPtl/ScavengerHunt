import { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { Icon, LatLng } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Clue, Coordinates } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { User, Navigation, MapPin } from "lucide-react";
import LocationSearch from "./location-search";

interface HuntMapProps {
  clues: Clue[];
  onAddClue?: (clue: Clue) => void;
  userLocation?: Coordinates | null;
  otherPlayers?: { userId: number; position: Coordinates; heading?: number; currentClueIndex?: number; teamId?: number | null }[];
  className?: string;
  onHeadingChange?: (heading: number) => void;
  showTeamColors?: boolean;
}

// Create a better location marker icon that looks like a pin
const markerIcon = new Icon({
  iconUrl: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0OCA1NiIgZmlsbD0ibm9uZSI+CiAgPHBhdGggZD0iTTI0IDAgQzEwLjc0NSAwIDAgMTAuNzQ1IDAgMjQgQzAgMzYuNDggMTkuOTIgNTQuMDc3IDIwLjc1NSA1NC43NCBDMjIuOTY3IDU2LjQyIDI1LjAzMyA1Ni40MiAyNy4yNDUgNTQuNzQgQzI4LjA4IDU0LjA3NyA0OCAzNi40OCA0OCAyNCBDNDggMTAuNzQ1IDM3LjI1NSAwIDI0IDBaTTI0IDMzIEMxOC4wMyAzMyAxMyAyNy45NyAxMyAyMiBDMTMgMTYuMDMgMTguMDMgMTEgMjQgMTEgQzI5Ljk3IDExIDM1IDE2LjAzIDM1IDIyIEMzNSAyNy45NyAyOS45NyAzMyAyNCAzM1oiIGZpbGw9IiNFNzRDM0MiLz4KICA8Y2lyY2xlIGN4PSIyNCIgY3k9IjIyIiByPSI4IiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4=",
  iconSize: [34, 40],
  iconAnchor: [17, 40],
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  shadowSize: [41, 41],
  shadowAnchor: [12, 41],
});

// Create a custom user location icon resembling Google Maps blue dot
const userIcon = new Icon({
  iconUrl: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSI+CiAgPGNpcmNsZSBjeD0iMjQiIGN5PSIyNCIgcj0iMTAiIGZpbGw9IiM0Mjg1RjQiIC8+CiAgPGNpcmNsZSBjeD0iMjQiIGN5PSIyNCIgcj0iOCIgZmlsbD0id2hpdGUiIC8+CiAgPGNpcmNsZSBjeD0iMjQiIGN5PSIyNCIgcj0iNCIgZmlsbD0iIzQyODVGNCIgLz4KPC9zdmc+Cg==",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

// Function to get a color based on team ID
// This creates distinct colors for different teams
const getTeamColor = (teamId?: number | null): string => {
  if (teamId === undefined || teamId === null) {
    return "#4285F4"; // Default blue for players without a team
  }
  
  // Array of distinctive colors for different teams
  const teamColors = [
    "#4285F4", // Blue (Google)
    "#EA4335", // Red (Google)
    "#FBBC05", // Yellow (Google)
    "#34A853", // Green (Google)
    "#8E24AA", // Purple
    "#00ACC1", // Cyan
    "#FB8C00", // Orange
    "#E53935", // Bright Red
    "#43A047", // Bright Green
    "#3949AB", // Indigo
    "#607D8B", // Blue Grey
    "#F06292", // Pink
  ];
  
  // Use modulo to ensure we always get a valid color even with many teams
  return teamColors[teamId % teamColors.length];
};

// Create a function to generate a directional player icon as an SVG
// This will create a Google Maps style marker with an arrow indicating direction
const createDirectionalIcon = (heading: number = 0, teamId?: number | null) => {
  // Get color based on team ID
  const color = getTeamColor(teamId);
  
  // Create SVG with a colored dot and directional triangle
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
    <!-- Main colored circle -->
    <circle cx="24" cy="24" r="12" fill="${color}" opacity="0.8" />
    <circle cx="24" cy="24" r="10" fill="#ffffff" />
    <circle cx="24" cy="24" r="7" fill="${color}" opacity="0.8" />
    
    <!-- Direction indicator (triangle) -->
    <path 
      d="M24 12 L28 20 L20 20 Z" 
      fill="${color}" 
      transform="rotate(${heading}, 24, 24)"
    />
  </svg>
  `;
  
  // Convert to base64
  const base64 = btoa(svg);
  
  // Create the icon
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${base64}`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

// Create a generic player icon for players without direction data
const createPlayerIcon = (teamId?: number | null) => {
  const color = getTeamColor(teamId);
  
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="24" r="12" fill="${color}" fill-opacity="0.8" />
    <circle cx="24" cy="24" r="10" fill="white" />
    <circle cx="24" cy="24" r="7" fill="${color}" fill-opacity="0.8" />
  </svg>
  `;
  
  const base64 = btoa(svg);
  
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${base64}`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

// A component to handle initial map centering and continuous user location tracking
// Returns the calculated heading so we can use it for the marker
function LocationTracker({ 
  position, 
  onHeadingChange 
}: { 
  position: Coordinates; 
  onHeadingChange?: (heading: number) => void;
}) {
  const map = useMap();
  const isInitialMount = useRef(true);
  const lastPos = useRef<LatLng | null>(null);
  
  useEffect(() => {
    // On initial mount, immediately center the map on user's location
    if (isInitialMount.current) {
      map.setView([position.latitude, position.longitude], 15);
      isInitialMount.current = false;
      return;
    }
    
    const newPos = new LatLng(position.latitude, position.longitude);
    
    // If we have a last position, calculate movement direction and smoothly update
    if (lastPos.current) {
      // Only animate if we've moved a minimum distance to avoid jitter
      const distance = newPos.distanceTo(lastPos.current);
      if (distance > 1) { // 1 meter minimum movement
        // Pan the map smoothly when user moves
        map.panTo(newPos, { 
          animate: true, 
          duration: 0.5 
        });
        
        // Calculate and report heading if callback provided
        if (onHeadingChange) {
          const deltaLat = newPos.lat - lastPos.current.lat;
          const deltaLng = newPos.lng - lastPos.current.lng;
          const heading = (Math.atan2(deltaLng, deltaLat) * (180 / Math.PI) + 360) % 360;
          onHeadingChange(heading);
        }
      }
    }
    
    lastPos.current = newPos;
  }, [map, position, onHeadingChange]);

  return null;
}

// Component to center map on search result
function MapCenterUpdater({ coordinates }: { coordinates: Coordinates | null }) {
  const map = useMap();

  useEffect(() => {
    if (coordinates) {
      map.setView(
        [coordinates.latitude, coordinates.longitude],
        16, // Zoom a bit closer for searched locations
        { animate: true }
      );
    }
  }, [map, coordinates]);

  return null;
}

function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (coords: Coordinates) => void;
}) {
  useMapEvents({
    click: (e) => {
      onMapClick({
        latitude: e.latlng.lat,
        longitude: e.latlng.lng,
      });
    },
  });
  return null;
}

export default function HuntMap({
  clues,
  onAddClue,
  userLocation,
  otherPlayers = [],
  className,
  onHeadingChange,
  showTeamColors = true,
}: HuntMapProps) {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [userHeading, setUserHeading] = useState<number>(0);
  const [searchedLocation, setSearchedLocation] = useState<Coordinates | null>(null);
  const [clickedPosition, setClickedPosition] = useState<Coordinates | null>(null);

  // Use an initial center that will be immediately replaced
  // once the user's location is available
  const defaultCenter: Coordinates = {
    latitude: 25.4938, // Approximate center of MNNIT campus
    longitude: 81.8657,
  };
  
  const center = searchedLocation || userLocation || defaultCenter;

  const handleMapClick = (coords: Coordinates) => {
    if (!onAddClue) return;
    
    // Set the clicked position first so we show a marker immediately
    setClickedPosition(coords);
    
    // Also call onAddClue to update the parent component
    onAddClue({
      text: "", // These will be filled in the form
      hint: "", // These will be filled in the form
      coordinates: coords,
    });
  };
  
  // Handle heading changes and pass to parent component if callback provided
  const handleHeadingChange = (heading: number) => {
    setUserHeading(heading);
    if (onHeadingChange) {
      onHeadingChange(heading);
    }
  };

  // Handle location search selection
  const handleSelectLocation = ({ coordinates }: { address: string; coordinates: Coordinates }) => {
    setSearchedLocation(coordinates);
    
    // Set clicked position to show the marker
    setClickedPosition(coordinates);
    
    // If we're in add clue mode, call onAddClue with the coordinates
    if (onAddClue) {
      onAddClue({
        text: "", // These will be filled in the form
        hint: "", // These will be filled in the form
        coordinates: coordinates,
      });
    }
  };

  return (
    <div className={cn("relative", className)}>
      {/* Location search box */}
      {onAddClue && (
        <div className="absolute top-2 left-2 right-2 z-10 bg-white/90 rounded-md shadow-md p-2 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <span className="font-medium text-sm">Find a location:</span>
          </div>
          <LocationSearch
            onSelectLocation={handleSelectLocation}
            placeholder="Search for a location to add clue..."
            className="mt-2" 
          />
          <div className="mt-2 text-xs text-muted-foreground">
            You can also click directly on the map to place a clue
          </div>
        </div>
      )}
      
      <MapContainer
        center={[center.latitude, center.longitude]}
        zoom={15}
        className="h-full w-full"
        whenReady={() => setMapLoaded(true)}
      >
        {/* MapCenterUpdater component to center map on searched location */}
        {searchedLocation && <MapCenterUpdater coordinates={searchedLocation} />}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {onAddClue && <MapClickHandler onMapClick={handleMapClick} />}

        {/* User location marker with real-time tracking and direction */}
        {userLocation && (
          <>
            <Marker
              position={[userLocation.latitude, userLocation.longitude]}
              icon={createDirectionalIcon(userHeading)}
            >
              <Popup>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Your current location</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Heading: {Math.round(userHeading)}°
                  </div>
                </div>
              </Popup>
            </Marker>
            <LocationTracker 
              position={userLocation} 
              onHeadingChange={handleHeadingChange}
            />
          </>
        )}

        {/* Other players markers with directional indicators */}
        {otherPlayers.map((player) => (
          <Marker
            key={player.userId}
            position={[player.position.latitude, player.position.longitude]}
            icon={player.heading !== undefined 
              ? createDirectionalIcon(player.heading, showTeamColors ? player.teamId : undefined) 
              : createPlayerIcon(showTeamColors ? player.teamId : undefined)}
          >
            <Popup>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Player {player.userId}</span>
                </div>
                {player.currentClueIndex !== undefined && (
                  <div className="text-xs text-gray-500">
                    Solving clue {player.currentClueIndex + 1}
                  </div>
                )}
                {player.heading !== undefined && (
                  <div className="text-xs text-gray-500">
                    Heading: {Math.round(player.heading)}°
                  </div>
                )}
                {player.teamId !== undefined && player.teamId !== null && (
                  <div className="text-xs text-gray-500">
                    Team: {player.teamId}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Only show clues when in edit mode (onAddClue is present) */}
        {onAddClue && clues.map((clue, index) => (
          <Marker
            key={index}
            position={[clue.coordinates.latitude, clue.coordinates.longitude]}
            icon={markerIcon}
          >
            <Popup>
              <div className="p-2">
                <p className="font-medium">Clue {index + 1}</p>
                <p className="text-sm">{clue.text}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Show the marker for the clicked position */}
        {clickedPosition && onAddClue && (
          <Marker
            position={[clickedPosition.latitude, clickedPosition.longitude]}
            icon={markerIcon}
          >
            <Popup>
              <div className="p-2 space-y-2">
                <h4 className="font-medium text-sm">Selected Location</h4>
                <div className="text-xs text-muted-foreground mb-2">
                  <div>Latitude: {clickedPosition.latitude.toFixed(6)}</div>
                  <div>Longitude: {clickedPosition.longitude.toFixed(6)}</div>
                </div>
                <p className="text-xs">
                  Add clue details in the form on the left.
                </p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
