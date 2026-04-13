import { useRouter } from 'next/router';
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  KeyboardEvent,
  MouseEvent,
} from 'react';
import { ISuggestionItem } from '../../../lib/search/types';

export interface ISearchWithSuggestionsProps {}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) {
    return text;
  }

  const escapedQuery = escapeRegExp(query);
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.toLowerCase() === query.toLowerCase()) {
      return (
        <mark key={index} className="bg-yellow-200 font-semibold">
          {part}
        </mark>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

const SearchWithSuggestions: React.FC<ISearchWithSuggestionsProps> = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [suggestions, setSuggestions] = useState<ISuggestionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/search/suggestions?q=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch suggestions');
      }

      setSuggestions(data.data);
      setIsOpen(data.data.length > 0);
      setHighlightedIndex(-1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSuggestions([]);
      setIsOpen(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuggestions(debouncedSearchTerm);
  }, [debouncedSearchTerm, fetchSuggestions]);

  useEffect(() => {
    const handleClickOutside = (event: globalThis.MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setHighlightedIndex(-1);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0 && searchTerm.trim()) {
      setIsOpen(true);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
        setIsOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => {
          if (error) return prev;
          const nextIndex = prev + 1;
          return nextIndex >= suggestions.length ? 0 : nextIndex;
        });
        break;

      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => {
          if (error) return prev;
          const prevIndex = prev - 1;
          return prevIndex < 0 ? suggestions.length - 1 : prevIndex;
        });
        break;

      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          const selectedSuggestion = suggestions[highlightedIndex];
          setSearchTerm(selectedSuggestion.title);
          setIsOpen(false);
          router.push(`/results?search=${encodeURIComponent(selectedSuggestion.title)}`);
        } else {
          handleSubmit();
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;

      default:
        break;
    }
  };

  const handleSuggestionClick = (
    e: MouseEvent<HTMLDivElement>,
    suggestion: ISuggestionItem
  ) => {
    e.preventDefault();
    setSearchTerm(suggestion.title);
    setIsOpen(false);
    router.push(`/results?search=${encodeURIComponent(suggestion.title)}`);
  };

  const handleSubmit = () => {
    if (searchTerm.trim()) {
      setIsOpen(false);
      router.push(`/results?search=${encodeURIComponent(searchTerm)}`);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit();
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <form
        className="flex flex-col items-center gap-y-5"
        onSubmit={handleFormSubmit}
      >
        <div className="relative w-5/6 sm:w-128">
          <input
            ref={inputRef}
            type="text"
            className="rounded-full border-2 w-full h-12 px-3 pr-12 focus:outline-none focus:border-blue-500"
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder="Search..."
            aria-autocomplete="list"
            aria-expanded={isOpen}
            aria-controls="suggestions-list"
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <svg
                className="animate-spin h-5 w-5 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          )}
        </div>

        <div className="space-x-3">
          <button type="submit" className="btn-primary">
            Google Search
          </button>
          <button
            type="button"
            onClick={() => alert('FEATURE COMING SOON!')}
            className="btn-primary"
          >
            I&apos;m Feeling Lucky
          </button>
        </div>
      </form>

      {isOpen && (
        <div
          id="suggestions-list"
          className="absolute left-1/2 transform -translate-x-1/2 w-5/6 sm:w-128 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
          role="listbox"
        >
          {error ? (
            <div className="p-4 text-center text-red-500">
              <div className="flex items-center justify-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((suggestion, index) => (
              <div
                key={suggestion.id}
                role="option"
                aria-selected={highlightedIndex === index}
                className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                  highlightedIndex === index
                    ? 'bg-blue-50'
                    : 'hover:bg-gray-50'
                }`}
                onClick={(e) => handleSuggestionClick(e, suggestion)}
              >
                <div className="text-sm font-medium text-gray-900">
                  {highlightText(suggestion.title, searchTerm)}
                </div>
                <div className="text-xs text-gray-500 mt-1 truncate">
                  {highlightText(suggestion.text, searchTerm)}
                </div>
              </div>
            ))
          ) : null}
        </div>
      )}
    </div>
  );
};

export default SearchWithSuggestions;
