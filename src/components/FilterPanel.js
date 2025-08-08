import React from "react";
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Typography,
  Slider,
  Switch,
  FormControlLabel,
  Button,
  Divider,
} from "@mui/material";
import { Clear as ClearIcon } from "@mui/icons-material";

const FilterPanel = ({ filters, onFilterChange, onClearFilters }) => {
  const handleCategoryChange = (event) => {
    onFilterChange("category", event.target.value);
  };

  const handleDifficultyChange = (event) => {
    onFilterChange("difficulty", event.target.value);
  };

  const handleDurationChange = (event, newValue) => {
    onFilterChange("duration", newValue);
  };

  const handleFreeOnlyChange = (event) => {
    onFilterChange("freeOnly", event.target.checked);
  };

  const handleRatingChange = (event, newValue) => {
    onFilterChange("minRating", newValue);
  };

  const hasActiveFilters = () => {
    return (
      filters.category ||
      filters.difficulty ||
      filters.freeOnly ||
      (filters.duration &&
        (filters.duration[0] > 0 || filters.duration[1] < 50)) ||
      (filters.minRating && filters.minRating > 0)
    );
  };

  return (
    <Box
      sx={{ p: 3, bgcolor: "background.paper", borderRadius: 2, boxShadow: 1 }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6">Filter Courses</Typography>
        {hasActiveFilters() && (
          <Button
            size="small"
            startIcon={<ClearIcon />}
            onClick={onClearFilters}
            sx={{ color: "text.secondary" }}
          >
            Clear All
          </Button>
        )}
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Category Filter */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Category</InputLabel>
        <Select
          value={filters.category || ""}
          label="Category"
          onChange={handleCategoryChange}
        >
          <MenuItem value="">All Categories</MenuItem>
          <MenuItem value="programming">Programming</MenuItem>
          <MenuItem value="design">Design</MenuItem>
          <MenuItem value="business">Business</MenuItem>
          <MenuItem value="marketing">Marketing</MenuItem>
          <MenuItem value="data-science">Data Science</MenuItem>
          <MenuItem value="photography">Photography</MenuItem>
          <MenuItem value="music">Music</MenuItem>
          <MenuItem value="language">Language</MenuItem>
          <MenuItem value="health">Health & Fitness</MenuItem>
        </Select>
      </FormControl>

      {/* Difficulty Filter */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Difficulty</InputLabel>
        <Select
          value={filters.difficulty || ""}
          label="Difficulty"
          onChange={handleDifficultyChange}
        >
          <MenuItem value="">All Levels</MenuItem>
          <MenuItem value="beginner">Beginner</MenuItem>
          <MenuItem value="intermediate">Intermediate</MenuItem>
          <MenuItem value="advanced">Advanced</MenuItem>
        </Select>
      </FormControl>

      {/* Duration Filter */}
      <Box sx={{ mb: 3 }}>
        <Typography gutterBottom>
          Duration:{" "}
          {filters.duration
            ? `${filters.duration[0]}-${filters.duration[1]}`
            : "0-50"}{" "}
          hours
        </Typography>
        <Slider
          value={filters.duration || [0, 50]}
          onChange={handleDurationChange}
          valueLabelDisplay="auto"
          min={0}
          max={50}
          marks={[
            { value: 0, label: "0h" },
            { value: 10, label: "10h" },
            { value: 25, label: "25h" },
            { value: 50, label: "50h+" },
          ]}
          sx={{ mt: 1 }}
        />
      </Box>

      {/* Rating Filter */}
      <Box sx={{ mb: 3 }}>
        <Typography gutterBottom>
          Minimum Rating: {filters.minRating || 0} stars
        </Typography>
        <Slider
          value={filters.minRating || 0}
          onChange={handleRatingChange}
          valueLabelDisplay="auto"
          min={0}
          max={5}
          step={0.5}
          marks={[
            { value: 0, label: "Any" },
            { value: 2.5, label: "2.5+" },
            { value: 4, label: "4+" },
            { value: 5, label: "5" },
          ]}
          sx={{ mt: 1 }}
        />
      </Box>

      {/* Free Only Filter */}
      <FormControlLabel
        control={
          <Switch
            checked={filters.freeOnly || false}
            onChange={handleFreeOnlyChange}
            color="primary"
          />
        }
        label="Free courses only"
        sx={{ mb: 2 }}
      />

      {/* Active Filters Display */}
      {hasActiveFilters() && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Active Filters:
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {filters.category && (
              <Chip
                label={`Category: ${filters.category}`}
                size="small"
                onDelete={() => onFilterChange("category", "")}
                color="primary"
                variant="outlined"
              />
            )}
            {filters.difficulty && (
              <Chip
                label={`Level: ${filters.difficulty}`}
                size="small"
                onDelete={() => onFilterChange("difficulty", "")}
                color="primary"
                variant="outlined"
              />
            )}
            {filters.freeOnly && (
              <Chip
                label="Free Only"
                size="small"
                onDelete={() => onFilterChange("freeOnly", false)}
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default FilterPanel;
