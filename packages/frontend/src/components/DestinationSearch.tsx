import React, { useState, useEffect, useRef } from 'react';
import { Coordinates } from '../services/navigationService';

interface DestinationSearchProps {
  onSelectDestination: (destination: Coordinates) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

/**
 * Destination Search Component
 * 목적지 검색 컴포넌트
 */
const DestinationSearch: React.FC<DestinationSearchProps> = ({
  onSelectDestination,
  onCancel,
  isLoading = false
}) => {
  const [query, setQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (window.google && searchInputRef.current) {
      const autocompleteOptions = {
        componentRestrictions: { country: 'kr' }, // Restrict to Korea
        fields: ['geometry', 'name', 'formatted_address']
      };
      
      const autocomplete = new google.maps.places.Autocomplete(
        searchInputRef.current,
        autocompleteOptions
      );
      
      // Listen for place selection
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry && place.geometry.location) {
          const destination: Coordinates = {
            latitude: place.geometry.location.lat(),
            longitude: place.geometry.location.lng()
          };
          onSelectDestination(destination);
        }
      });
    }
  }, [onSelectDestination]);
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    if (value.length > 2) {
      // In a real implementation, we'd call a geocoding service
      // For now, mocking the search
      mockSearch(value);
    } else {
      setSearchResults([]);
    }
  };
  
  // Mock search function - in a real app you'd use a geocoding service
  const mockSearch = (searchQuery: string) => {
    setIsSearching(true);
    
    // Simulate API call
    setTimeout(() => {
      // Mock some results
      const mockResults = [
        {
          id: '1',
          name: `${searchQuery} 회사`,
          address: '서울특별시 강남구',
          location: { latitude: 37.5172, longitude: 127.0473 }
        },
        {
          id: '2',
          name: `${searchQuery} 공원`,
          address: '서울특별시 중구',
          location: { latitude: 37.5643, longitude: 126.9771 }
        },
        {
          id: '3',
          name: `${searchQuery} 카페`,
          address: '서울특별시 마포구',
          location: { latitude: 37.5559, longitude: 126.9237 }
        }
      ];
      
      setSearchResults(mockResults);
      setIsSearching(false);
    }, 500);
  };
  
  // Handle result selection
  const handleResultSelect = (result: any) => {
    onSelectDestination(result.location);
    setQuery('');
    setSearchResults([]);
  };
  
  return (
    <div className="w-full max-w-md bg-white shadow-md rounded-lg p-4">
      <div className="font-bold text-lg mb-2">목적지 검색</div>
      
      <div className="relative">
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={handleSearchChange}
          placeholder="목적지를 입력하세요"
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        
        {isSearching && (
          <div className="absolute right-3 top-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
          </div>
        )}
        
        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white shadow-lg rounded-md border border-gray-200">
            <ul className="divide-y divide-gray-200">
              {searchResults.map((result) => (
                <li key={result.id} className="cursor-pointer hover:bg-gray-50">
                  <button 
                    className="w-full text-left px-4 py-3"
                    onClick={() => handleResultSelect(result)}
                  >
                    <div className="font-medium">{result.name}</div>
                    <div className="text-sm text-gray-500">{result.address}</div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      <div className="text-sm text-gray-500 mt-2">
        지도에서 직접 목적지를 선택할 수도 있습니다.
      </div>
      
      {onCancel && (
        <div className="mt-4">
          <button
            onClick={onCancel}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            취소
          </button>
        </div>
      )}
    </div>
  );
};

export default DestinationSearch;