declare module 'react-places-autocomplete' {
  export interface Suggestion {
    active: boolean;
    description: string;
    placeId: string;
    formattedSuggestion: {
      mainText: string;
      secondaryText: string;
    };
    matchedSubstrings: Array<{
      length: number;
      offset: number;
    }>;
    terms: Array<{
      offset: number;
      value: string;
    }>;
    types: string[];
  }

  export interface LatLng {
    lat: number;
    lng: number;
  }

  export interface PlacesAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    onSelect?: (value: string, placeId?: string) => void;
    onError?: (status: string, clearSuggestions: () => void) => void;
    searchOptions?: {
      location?: { lat: number; lng: number };
      radius?: number;
      types?: string[];
      componentRestrictions?: { country: string | string[] };
    };
    debounce?: number;
    highlightFirstSuggestion?: boolean;
    shouldFetchSuggestions?: boolean;
    googleCallbackName?: string;
    children: (options: {
      getInputProps: (options?: any) => any;
      suggestions: Suggestion[];
      getSuggestionItemProps: (suggestion: Suggestion, options?: any) => any;
      loading: boolean;
    }) => React.ReactNode;
  }

  const PlacesAutocomplete: React.ComponentType<PlacesAutocompleteProps>;
  
  export function geocodeByAddress(address: string): Promise<any[]>;
  export function geocodeByPlaceId(placeId: string): Promise<any[]>;
  export function getLatLng(result: any): Promise<LatLng>;
  
  export default PlacesAutocomplete;
}