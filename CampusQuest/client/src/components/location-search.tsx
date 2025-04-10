import { useState, useEffect } from 'react';
import PlacesAutocomplete, { geocodeByAddress, getLatLng, Suggestion } from 'react-places-autocomplete';
import { Coordinates } from '@shared/schema';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

// Add type declarations for the Google Maps API
declare global {
  interface Window {
    google?: {
      maps?: any;
    };
  }
}

// Load Google Maps Script
const loadGoogleMapsScript = async (callback: () => void) => {
  try {
    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      callback();
      return;
    }
    
    // Otherwise, fetch the API key from the server
    const response = await fetch('/api/config/maps');
    const data = await response.json();
    const apiKey = data.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.error('Google Maps API key is not available');
      return;
    }
    
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', callback);
    document.head.appendChild(script);
  } catch (error) {
    console.error('Error loading Google Maps script:', error);
  }
};

interface LocationSearchProps {
  onSelectLocation: (location: { address: string; coordinates: Coordinates }) => void;
  placeholder?: string;
  className?: string;
}

export default function LocationSearch({ 
  onSelectLocation, 
  placeholder = "Search for a location...",
  className = ""
}: LocationSearchProps) {
  const [address, setAddress] = useState('');
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    loadGoogleMapsScript(() => {
      setScriptLoaded(true);
    });
  }, []);

  const handleSelect = async (selectedAddress: string) => {
    try {
      const results = await geocodeByAddress(selectedAddress);
      const latLng = await getLatLng(results[0]);
      
      onSelectLocation({
        address: selectedAddress,
        coordinates: {
          latitude: latLng.lat,
          longitude: latLng.lng
        }
      });
      
      setAddress('');
    } catch (error) {
      console.error('Error selecting location:', error);
    }
  };

  if (!scriptLoaded) {
    return (
      <Input
        className={className}
        placeholder="Loading location search..."
        disabled
      />
    );
  }

  return (
    <PlacesAutocomplete
      value={address}
      onChange={setAddress}
      onSelect={handleSelect}
    >
      {({ getInputProps, suggestions, getSuggestionItemProps, loading }) => (
        <div className="relative w-full">
          <div className="relative">
            <Input
              {...getInputProps({
                placeholder,
                className: `${className} pr-10`,
              })}
            />
            <Search className="h-4 w-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          </div>
          
          {(suggestions.length > 0 || loading) && (
            <div className="absolute z-50 mt-1 w-full bg-background border rounded-md shadow-lg">
              {loading && (
                <div className="p-2 text-sm text-muted-foreground">
                  Loading results...
                </div>
              )}
              
              {suggestions.map((suggestion) => {
                const style = {
                  backgroundColor: suggestion.active ? 'var(--primary-50)' : 'transparent',
                  cursor: 'pointer',
                };
                
                return (
                  <div
                    {...getSuggestionItemProps(suggestion, { style })}
                    key={suggestion.placeId}
                    className="p-2 hover:bg-muted text-sm border-b last:border-0"
                  >
                    {suggestion.description}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </PlacesAutocomplete>
  );
}