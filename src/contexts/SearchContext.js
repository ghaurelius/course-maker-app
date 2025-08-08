import React, { createContext, useContext, useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";

const SearchContext = createContext();

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
};

export const SearchProvider = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  // Filter states
  const [filters, setFilters] = useState({
    category: "",
    difficulty: "",
    duration: "",
    minRating: 0,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  // Categories and difficulty levels
  const categories = [
    "Programming",
    "Design",
    "Business",
    "Marketing",
    "Photography",
    "Music",
    "Health",
    "Language",
    "Other",
  ];

  const difficultyLevels = ["Beginner", "Intermediate", "Advanced"];
  const durationRanges = [
    { label: "Short (< 2 hours)", value: "short", max: 2 },
    { label: "Medium (2-8 hours)", value: "medium", min: 2, max: 8 },
    { label: "Long (> 8 hours)", value: "long", min: 8 },
  ];

  // Search function
  const searchCourses = async (
    searchTerm = searchQuery,
    currentFilters = filters,
  ) => {
    if (
      !searchTerm.trim() &&
      !Object.values(currentFilters).some((filter) => filter)
    ) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      let coursesQuery = collection(db, "courses");
      let constraints = [];

      // Only search published courses
      constraints.push(where("isPublished", "==", true));

      // Category filter
      if (currentFilters.category) {
        constraints.push(where("category", "==", currentFilters.category));
      }

      // Difficulty filter
      if (currentFilters.difficulty) {
        constraints.push(where("difficulty", "==", currentFilters.difficulty));
      }

      // Rating filter
      if (currentFilters.minRating > 0) {
        constraints.push(
          where("averageRating", ">=", currentFilters.minRating),
        );
      }

      // Apply constraints
      if (constraints.length > 0) {
        coursesQuery = query(coursesQuery, ...constraints);
      }

      // Add ordering
      const orderField = currentFilters.sortBy || "createdAt";
      const orderDirection = currentFilters.sortOrder || "desc";
      coursesQuery = query(coursesQuery, orderBy(orderField, orderDirection));

      const querySnapshot = await getDocs(coursesQuery);
      let results = [];

      querySnapshot.forEach((doc) => {
        const courseData = { id: doc.id, ...doc.data() };
        results.push(courseData);
      });

      // Client-side text search (since Firestore doesn't support full-text search)
      if (searchTerm.trim()) {
        const searchTermLower = searchTerm.toLowerCase();
        results = results.filter((course) => {
          const titleMatch = course.title
            ?.toLowerCase()
            .includes(searchTermLower);
          const descriptionMatch = course.description
            ?.toLowerCase()
            .includes(searchTermLower);
          const tagsMatch = course.tags?.some((tag) =>
            tag.toLowerCase().includes(searchTermLower),
          );
          const keywordsMatch = course.searchKeywords?.some((keyword) =>
            keyword.toLowerCase().includes(searchTermLower),
          );

          return titleMatch || descriptionMatch || tagsMatch || keywordsMatch;
        });
      }

      // Duration filter (client-side)
      if (currentFilters.duration) {
        const durationRange = durationRanges.find(
          (range) => range.value === currentFilters.duration,
        );
        if (durationRange) {
          results = results.filter((course) => {
            const totalDuration =
              course.lessons?.reduce((total, lesson) => {
                return total + (lesson.duration || 0);
              }, 0) || 0;
            const hours = totalDuration / 60; // Convert minutes to hours

            if (durationRange.min && durationRange.max) {
              return hours >= durationRange.min && hours <= durationRange.max;
            } else if (durationRange.max) {
              return hours < durationRange.max;
            } else if (durationRange.min) {
              return hours > durationRange.min;
            }
            return true;
          });
        }
      }

      setSearchResults(results);

      // Add to search history
      if (searchTerm.trim()) {
        addToSearchHistory(searchTerm);
      }
    } catch (error) {
      console.error("Error searching courses:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Get search suggestions
  const getSearchSuggestions = async (searchTerm) => {
    if (!searchTerm.trim() || searchTerm.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const coursesQuery = query(
        collection(db, "courses"),
        where("isPublished", "==", true),
        limit(10),
      );

      const querySnapshot = await getDocs(coursesQuery);
      const allSuggestions = new Set();

      querySnapshot.forEach((doc) => {
        const course = doc.data();
        const searchTermLower = searchTerm.toLowerCase();

        // Add matching titles
        if (course.title?.toLowerCase().includes(searchTermLower)) {
          allSuggestions.add(course.title);
        }

        // Add matching tags
        course.tags?.forEach((tag) => {
          if (tag.toLowerCase().includes(searchTermLower)) {
            allSuggestions.add(tag);
          }
        });

        // Add matching keywords
        course.searchKeywords?.forEach((keyword) => {
          if (keyword.toLowerCase().includes(searchTermLower)) {
            allSuggestions.add(keyword);
          }
        });
      });

      setSuggestions(Array.from(allSuggestions).slice(0, 5));
    } catch (error) {
      console.error("Error getting suggestions:", error);
      setSuggestions([]);
    }
  };

  // Add to search history
  const addToSearchHistory = (searchTerm) => {
    const newHistory = [
      searchTerm,
      ...searchHistory.filter((term) => term !== searchTerm),
    ].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem("courseSearchHistory", JSON.stringify(newHistory));
  };

  // Load search history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem("courseSearchHistory");
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Update filters
  const updateFilters = (newFilters) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    searchCourses(searchQuery, updatedFilters);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSuggestions([]);
    setFilters({
      category: "",
      difficulty: "",
      duration: "",
      minRating: 0,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  };

  const value = {
    // State
    searchQuery,
    searchResults,
    isSearching,
    searchHistory,
    suggestions,
    filters,

    // Constants
    categories,
    difficultyLevels,
    durationRanges,

    // Functions
    setSearchQuery,
    searchCourses,
    getSearchSuggestions,
    updateFilters,
    clearSearch,
    addToSearchHistory,
  };

  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  );
};
