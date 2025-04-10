import { useState } from 'react';
import { Coordinates } from '@shared/schema';

// Calculate distance between two coordinates in meters
function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const earthRadius = 6371000; // meters
  const lat1 = coord1.latitude * Math.PI / 180;
  const lat2 = coord2.latitude * Math.PI / 180;
  const lon1 = coord1.longitude * Math.PI / 180;
  const lon2 = coord2.longitude * Math.PI / 180;
  
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return earthRadius * c;
}

// Get cardinal direction symbol (compass point)
function getDirectionSymbol(target: Coordinates, current: Coordinates): string {
  const bearing = getBearing(current, target);
  
  if (bearing >= 337.5 || bearing < 22.5) return '↑'; // N
  if (bearing >= 22.5 && bearing < 67.5) return '↗'; // NE
  if (bearing >= 67.5 && bearing < 112.5) return '→'; // E
  if (bearing >= 112.5 && bearing < 157.5) return '↘'; // SE
  if (bearing >= 157.5 && bearing < 202.5) return '↓'; // S
  if (bearing >= 202.5 && bearing < 247.5) return '↙'; // SW
  if (bearing >= 247.5 && bearing < 292.5) return '←'; // W
  if (bearing >= 292.5 && bearing < 337.5) return '↖'; // NW
  
  return '?';
}

// Calculate bearing between two coordinates
function getBearing(start: Coordinates, end: Coordinates): number {
  const startLat = start.latitude * Math.PI / 180;
  const startLng = start.longitude * Math.PI / 180;
  const endLat = end.latitude * Math.PI / 180;
  const endLng = end.longitude * Math.PI / 180;
  
  const y = Math.sin(endLng - startLng) * Math.cos(endLat);
  const x = Math.cos(startLat) * Math.sin(endLat) -
            Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
  
  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  bearing = (bearing + 360) % 360; // Normalize to 0-360
  
  return bearing;
}

interface ARViewProps {
  clueLocation: Coordinates;
  userLocation: Coordinates | null;
  onClose: () => void;
}

export default function ARView({ clueLocation, userLocation, onClose }: ARViewProps) {
  const [compassView, setCompassView] = useState<boolean>(true);
  
  // Calculate distance if user location is available
  const distance = userLocation ? 
    calculateDistance(clueLocation, userLocation) : null;
  
  return (
    <div className="fixed inset-0 z-[1000] bg-gradient-to-b from-blue-900 to-black">
      <div className="container mx-auto h-full flex flex-col items-center justify-center px-4">
        <div className="bg-black/50 w-full max-w-md rounded-xl shadow-xl p-8 backdrop-blur-md">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">Clue Location Preview</h2>
          
          <div className="flex justify-center mb-6">
            {compassView ? (
              <div className="relative w-64 h-64">
                {/* Compass background */}
                <div className="absolute inset-0 rounded-full bg-gray-800 border-4 border-gray-700 shadow-lg"></div>
                
                {/* Compass circles */}
                <div className="absolute inset-8 border-2 border-gray-600 rounded-full opacity-30"></div>
                <div className="absolute inset-16 border-2 border-gray-600 rounded-full opacity-30"></div>
                
                {/* Compass cardinal points */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 text-white font-bold text-lg">N</div>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white font-bold text-lg">E</div>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white font-bold text-lg">S</div>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white font-bold text-lg">W</div>
                
                {/* Ordinal points */}
                <div className="absolute top-[20%] right-[20%] text-white text-xs">NE</div>
                <div className="absolute bottom-[20%] right-[20%] text-white text-xs">SE</div>
                <div className="absolute bottom-[20%] left-[20%] text-white text-xs">SW</div>
                <div className="absolute top-[20%] left-[20%] text-white text-xs">NW</div>
                
                {/* Center point - you are here */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-blue-500 shadow-md z-10"></div>
                  <div className="absolute w-6 h-6 rounded-full bg-blue-500/30 animate-ping"></div>
                </div>
                
                {/* Direction pointer */}
                {userLocation && (
                  <div 
                    className="absolute top-1/2 left-1/2 w-1 h-20 bg-gradient-to-t from-red-600 to-red-400"
                    style={{
                      transformOrigin: 'bottom center',
                      transform: `translate(-50%, -100%) rotate(${getBearing(userLocation, clueLocation)}deg)`
                    }}
                  >
                    <div className="w-4 h-4 -ml-1.5 -mt-1 bg-red-500 rounded-full shadow"></div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-64 w-64 flex items-center justify-center">
                <div className="relative flex flex-col items-center">
                  {/* Map pin body */}
                  <div className="w-16 h-16 bg-red-500 rounded-t-full"></div>
                  
                  {/* Map pin point */}
                  <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px] border-t-red-500"></div>
                  
                  {/* Pulse rings */}
                  <div className="absolute -top-4 w-24 h-24 rounded-full border-4 border-red-400/50 animate-pulse"></div>
                  <div className="absolute -top-8 w-32 h-32 rounded-full border-4 border-red-400/30 animate-pulse"></div>
                  <div className="absolute -top-12 w-40 h-40 rounded-full border-4 border-red-400/20 animate-pulse"></div>
                  
                  {/* Inner white circle */}
                  <div className="absolute top-[4px] left-1/2 transform -translate-x-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center">
                    <div className="w-4 h-4 bg-red-500 rounded-full animate-ping"></div>
                  </div>
                  
                  {/* Pin drop shadow */}
                  <div className="absolute -bottom-4 w-6 h-1 bg-black/30 rounded-full blur-sm"></div>
                  
                  {/* Destination text */}
                  <div className="absolute -bottom-14 text-white font-bold whitespace-nowrap">
                    Clue Location
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-center mb-8">
            <button
              className={`px-4 py-2 rounded-l-md ${compassView ? 'bg-primary text-primary-foreground' : 'bg-gray-700 text-gray-300'}`}
              onClick={() => setCompassView(true)}
            >
              Compass
            </button>
            <button
              className={`px-4 py-2 rounded-r-md ${!compassView ? 'bg-primary text-primary-foreground' : 'bg-gray-700 text-gray-300'}`}
              onClick={() => setCompassView(false)}
            >
              Marker
            </button>
          </div>
          
          {userLocation && (
            <div className="bg-gray-800/80 rounded-lg p-4 mb-6 border border-gray-700">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900/60 rounded p-3 flex flex-col items-center">
                  <span className="text-gray-400 text-xs mb-1">DISTANCE</span>
                  <span className="text-white font-mono text-xl">
                    {distance !== null ? `${Math.round(distance)}m` : 'Unknown'}
                  </span>
                </div>
                
                <div className="bg-gray-900/60 rounded p-3 flex flex-col items-center">
                  <span className="text-gray-400 text-xs mb-1">DIRECTION</span>
                  <span className="text-white text-2xl">
                    {getDirectionSymbol(clueLocation, userLocation)}
                  </span>
                </div>
              </div>
              
              <div className="mt-3 text-xs text-center text-gray-400">
                Bearing: {Math.round(getBearing(userLocation, clueLocation))}°
              </div>
            </div>
          )}
          
          <div className="text-center text-gray-300 text-sm mb-6">
            {userLocation ? (
              <p>Use this preview to help navigate to the clue location.</p>
            ) : (
              <p>Enable location services to see distance and direction.</p>
            )}
          </div>
          
          <button
            className="w-full bg-destructive text-destructive-foreground py-3 rounded-md font-medium"
            onClick={onClose}
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}