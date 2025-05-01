import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Coordinates } from '../services/navigationService';

interface SearchResult {
  id: string;
  name: string;
  address: string;
  location: Coordinates;
}

interface DestinationSearchProps {
  onSelectDestination: (destination: Coordinates) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  initialQuery?: string;
}

/**
 * Destination Search Component
 * 목적지 검색 컴포넌트
 */
const DestinationSearch: React.FC<DestinationSearchProps> = ({
  onSelectDestination,
  onCancel,
  isLoading = false,
  initialQuery = ''
}) => {
  const [query, setQuery] = useState<string>(initialQuery);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (window.google && searchInputRef.current) {
      const autocompleteOptions = {
        componentRestrictions: { country: 'kr' },
        fields: ['geometry', 'name', 'formatted_address']
      };
      
      const autocomplete = new google.maps.places.Autocomplete(
        searchInputRef.current,
        autocompleteOptions
      );
      
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
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    if (value.length > 2) {
      mockSearch(value);
    } else {
      setSearchResults([]);
    }
  }, []);
  
  // Mock search function
  const mockSearch = useCallback((searchQuery: string) => {
    setIsSearching(true);
    
    setTimeout(() => {
      const mockResults: SearchResult[] = [
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
  }, []);
  
  // Handle result selection
  const handleResultSelect = useCallback((result: SearchResult) => {
    onSelectDestination(result.location);
    setQuery('');
    setSearchResults([]);
  }, [onSelectDestination]);

  // Memoized search results
  const searchResultsList = useMemo(() => (
    <div className="absolute z-10 w-full mt-1 bg-white shadow-lg rounded-md border border-gray-200">
      <ul className="divide-y divide-gray-200">
        {searchResults.map((result) => (
          <li key={result.id} className="cursor-pointer hover:bg-gray-50">
            <button 
              className="w-full text-left px-4 py-3"
              onClick={() => handleResultSelect(result)}
              aria-label={`${result.name} 선택`}
            >
              <div className="font-medium">{result.name}</div>
              <div className="text-sm text-gray-500">{result.address}</div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  ), [searchResults, handleResultSelect]);
  
  return (
    <div 
      className="w-full max-w-md bg-white shadow-md rounded-lg p-4"
      role="search"
      aria-label="목적지 검색"
    >
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
          aria-label="목적지 검색 입력"
        />
        
        {isSearching && (
          <div 
            className="absolute right-3 top-3"
            role="status"
            aria-label="검색 중"
          >
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
          </div>
        )}
        
        {searchResults.length > 0 && searchResultsList}
      </div>
      
      <div className="text-sm text-gray-500 mt-2">
        지도에서 직접 목적지를 선택할 수도 있습니다.
      </div>
      
      {onCancel && (
        <div className="mt-4">
          <button
            onClick={onCancel}
            className="text-blue-600 hover:text-blue-800 font-medium"
            aria-label="검색 취소"
          >
            취소
          </button>
        </div>
      )}
    </div>
  );
};

export default DestinationSearch;