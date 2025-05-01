import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SearchFilter,
  SearchResult,
  SavedSearch,
} from '../types/report';
import { useAuth } from './AuthContext';

interface SearchContextType {
  results: SearchResult | null;
  savedSearches: SavedSearch[];
  loading: boolean;
  error: string | null;
  search: (filter: SearchFilter) => Promise<SearchResult>;
  saveSearch: (name: string, filter: SearchFilter, description?: string) => Promise<void>;
  deleteSavedSearch: (id: string) => Promise<void>;
  setDefaultSearch: (id: string) => Promise<void>;
  getSavedSearch: (id: string) => SavedSearch | undefined;
  clearResults: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [results, setResults] = useState<SearchResult | null>(null);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSavedSearches();
  }, []);

  const loadSavedSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem('saved_searches');
      setSavedSearches(stored ? JSON.parse(stored) : []);
    } catch (err) {
      setError('저장된 검색 로드 중 오류가 발생했습니다.');
      console.error('저장된 검색 로드 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveSavedSearches = async (newSearches: SavedSearch[]) => {
    try {
      await AsyncStorage.setItem('saved_searches', JSON.stringify(newSearches));
      setSavedSearches(newSearches);
    } catch (err) {
      setError('검색 저장 중 오류가 발생했습니다.');
      console.error('검색 저장 오류:', err);
    }
  };

  const search = async (filter: SearchFilter): Promise<SearchResult> => {
    try {
      setLoading(true);

      // 여기에서 실제 API 호출이 필요합니다.
      // 예시 데이터를 사용합니다.
      const mockResult: SearchResult = {
        items: [],
        total: 0,
        page: filter.page,
        totalPages: 0,
        filter,
      };

      setResults(mockResult);
      return mockResult;
    } catch (err) {
      setError('검색 중 오류가 발생했습니다.');
      console.error('검색 오류:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const saveSearch = async (
    name: string,
    filter: SearchFilter,
    description?: string
  ) => {
    try {
      const newSearch: SavedSearch = {
        id: Date.now().toString(),
        name,
        description,
        filter,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: user?.id || 'anonymous',
      };

      const newSearches = [...savedSearches, newSearch];
      await saveSavedSearches(newSearches);
    } catch (err) {
      setError('검색 저장 중 오류가 발생했습니다.');
      console.error('검색 저장 오류:', err);
    }
  };

  const deleteSavedSearch = async (id: string) => {
    try {
      const newSearches = savedSearches.filter(search => search.id !== id);
      await saveSavedSearches(newSearches);
    } catch (err) {
      setError('저장된 검색 삭제 중 오류가 발생했습니다.');
      console.error('저장된 검색 삭제 오류:', err);
    }
  };

  const setDefaultSearch = async (id: string) => {
    try {
      const newSearches = savedSearches.map(search => ({
        ...search,
        isDefault: search.id === id,
      }));
      await saveSavedSearches(newSearches);
    } catch (err) {
      setError('기본 검색 설정 중 오류가 발생했습니다.');
      console.error('기본 검색 설정 오류:', err);
    }
  };

  const getSavedSearch = (id: string) => {
    return savedSearches.find(search => search.id === id);
  };

  const clearResults = () => {
    setResults(null);
  };

  return (
    <SearchContext.Provider
      value={{
        results,
        savedSearches,
        loading,
        error,
        search,
        saveSearch,
        deleteSavedSearch,
        setDefaultSearch,
        getSavedSearch,
        clearResults,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}; 