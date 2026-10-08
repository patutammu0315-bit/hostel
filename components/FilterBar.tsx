'use client';

import React from 'react';
import { Search, RotateCcw, Download, Calendar } from 'lucide-react';

interface FilterBarProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  searchQuery: string;
  onSearchChange: (search: string) => void;
  onClearFilters: () => void;
  onExport: () => void;
  isExporting: boolean;
}

export function FilterBar({
  selectedDate,
  onDateChange,
  selectedMonth,
  onMonthChange,
  searchQuery,
  onSearchChange,
  onClearFilters,
  onExport,
  isExporting,
}: FilterBarProps) {
  const hasActiveFilters = Boolean(selectedDate || selectedMonth || searchQuery);

  return (
    <div className="filter-bar">
      {/* Date Filter */}
      <div className="form-group" style={{ minWidth: 160 }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Filter by Date
        </label>
        <input
          type="date"
          className="form-control"
          value={selectedDate}
          onChange={(e) => {
            onDateChange(e.target.value);
            if (e.target.value) onMonthChange(''); // clear month if specific date chosen
          }}
          placeholder="Select Date"
        />
      </div>

      {/* Month Filter */}
      <div className="form-group" style={{ minWidth: 160 }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Filter by Month
        </label>
        <input
          type="month"
          className="form-control"
          value={selectedMonth}
          onChange={(e) => {
            onMonthChange(e.target.value);
            if (e.target.value) onDateChange(''); // clear date if month chosen
          }}
          placeholder="Select Month"
        />
      </div>

      {/* Search Input */}
      <div className="form-group" style={{ flex: '1 1 200px' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Search Submitted By
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="form-control"
            style={{ width: '100%', paddingLeft: '2rem' }}
            placeholder="Search phone number / sender..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-end' }}>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="btn btn-outline"
            title="Clear all applied filters"
          >
            <RotateCcw size={14} />
            <span>Clear</span>
          </button>
        )}

        <button
          type="button"
          onClick={onExport}
          disabled={isExporting}
          className="btn btn-primary"
          title="Export CSV for current records"
        >
          <Download size={14} />
          <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
        </button>
      </div>
    </div>
  );
}
