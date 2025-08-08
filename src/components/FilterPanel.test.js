import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import FilterPanel from "./FilterPanel";

const theme = createTheme();

const renderWithTheme = (component) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

const mockFilters = {
  category: "",
  difficulty: "",
  duration: [0, 50],
  minRating: 0,
  freeOnly: false,
};

const mockOnFilterChange = jest.fn();
const mockOnClearFilters = jest.fn();

describe("FilterPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders filter panel with all controls", async () => {
    renderWithTheme(
      <FilterPanel
        filters={mockFilters}
        onFilterChange={mockOnFilterChange}
        onClearFilters={mockOnClearFilters}
      />,
    );

    // Check for the main title
    expect(screen.getByText("Filter Courses")).toBeInTheDocument();

    // Check for form controls using text content instead of labels
    expect(screen.getByText("All Categories")).toBeInTheDocument();
    expect(screen.getByText("All Levels")).toBeInTheDocument();

    // Check for switch text
    expect(screen.getByText("Free courses only")).toBeInTheDocument();
  });

  test("shows clear all button when filters are active", async () => {
    const activeFilters = {
      ...mockFilters,
      category: "programming",
    };

    renderWithTheme(
      <FilterPanel
        filters={activeFilters}
        onFilterChange={mockOnFilterChange}
        onClearFilters={mockOnClearFilters}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Clear All")).toBeInTheDocument();
    });
  });

  test("calls onClearFilters when clear all is clicked", async () => {
    const activeFilters = {
      ...mockFilters,
      category: "programming",
    };

    renderWithTheme(
      <FilterPanel
        filters={activeFilters}
        onFilterChange={mockOnFilterChange}
        onClearFilters={mockOnClearFilters}
      />,
    );

    const clearButton = await screen.findByText("Clear All");
    fireEvent.click(clearButton);

    expect(mockOnClearFilters).toHaveBeenCalled();
  });

  test("renders component structure correctly", () => {
    renderWithTheme(
      <FilterPanel
        filters={mockFilters}
        onFilterChange={mockOnFilterChange}
        onClearFilters={mockOnClearFilters}
      />,
    );

    // Test that the component renders without crashing
    expect(screen.getByText("Filter Courses")).toBeInTheDocument();

    // Test that basic elements are present
    const categorySelect = screen.getByDisplayValue("");
    expect(categorySelect).toBeInTheDocument();
  });
});
