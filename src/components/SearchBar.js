import React, { useState, useEffect, useRef } from "react";
import { useSearch } from "../contexts/SearchContext";
import "./SearchBar.css";

const SearchBar = ({
  placeholder = "Search courses...",
  showFilters = true,
}) => {
  const {
    searchQuery,
    setSearchQuery,
    searchCourses,
    getSearchSuggestions,
    suggestions,
    searchHistory,
    clearSearch,
    isSearching,
  } = useSearch();

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (value.trim().length >= 2) {
      getSearchSuggestions(value);
      setShowSuggestions(true);
      setShowHistory(false);
    } else if (value.trim().length === 0) {
      setShowSuggestions(false);
      setShowHistory(searchHistory.length > 0);
    } else {
      setShowSuggestions(false);
      setShowHistory(false);
    }
  };

  // Handle search submission
  const handleSearch = (searchTerm = searchQuery) => {
    if (searchTerm.trim()) {
      setSearchQuery(searchTerm);
      searchCourses(searchTerm);
      setShowSuggestions(false);
      setShowHistory(false);
      searchInputRef.current?.blur();
    }
  };

  // Handle input focus
  const handleInputFocus = () => {
    setInputFocused(true);
    if (searchQuery.trim().length === 0 && searchHistory.length > 0) {
      setShowHistory(true);
    } else if (searchQuery.trim().length >= 2) {
      setShowSuggestions(true);
    }
  };

  // Handle input blur
  const handleInputBlur = () => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => {
      setInputFocused(false);
      setShowSuggestions(false);
      setShowHistory(false);
    }, 200);
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    handleSearch(suggestion);
  };

  // Handle history item click
  const handleHistoryClick = (historyItem) => {
    handleSearch(historyItem);
  };

  // Handle clear search
  const handleClearSearch = () => {
    clearSearch();
    searchInputRef.current?.focus();
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setShowHistory(false);
      searchInputRef.current?.blur();
    }
  };

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        !searchInputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
        setShowHistory(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="search-bar-container">
      <div className="search-input-wrapper">
        <div className="search-input-container">
          <svg
            className="search-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>

          <input
            ref={searchInputRef}
            type="text"
            className="search-input"
            placeholder={placeholder}
            value={searchQuery}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyPress={handleKeyPress}
          />

          {isSearching && (
            <div className="search-loading">
              <div className="loading-spinner"></div>
            </div>
          )}

          {searchQuery && (
            <button
              className="clear-search-btn"
              onClick={handleClearSearch}
              type="button"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        <button
          className="search-btn"
          onClick={() => handleSearch()}
          disabled={!searchQuery.trim() || isSearching}
        >
          Search
        </button>
      </div>

      {/* Suggestions and History Dropdown */}
      {(showSuggestions || showHistory) && (
        <div ref={suggestionsRef} className="search-dropdown">
          {showSuggestions && suggestions.length > 0 && (
            <div className="suggestions-section">
              <div className="dropdown-header">Suggestions</div>
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="dropdown-item suggestion-item"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <svg
                    className="suggestion-icon"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <span className="suggestion-text">{suggestion}</span>
                </div>
              ))}
            </div>
          )}

          {showHistory && searchHistory.length > 0 && (
            <div className="history-section">
              <div className="dropdown-header">Recent Searches</div>
              {searchHistory.slice(0, 5).map((historyItem, index) => (
                <div
                  key={index}
                  className="dropdown-item history-item"
                  onClick={() => handleHistoryClick(historyItem)}
                >
                  <svg
                    className="history-icon"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="history-text">{historyItem}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
