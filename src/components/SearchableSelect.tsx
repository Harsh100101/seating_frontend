import React, { useState, useEffect, useRef, useMemo, useId } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';

export interface SearchableSelectProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  emptyOptionLabel?: string;
  disabled?: boolean;
  hasError?: boolean;
  ariaDescribedBy?: string;
  className?: string;
}

function highlightMatch(text: string, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return text;
  const index = text.toLowerCase().indexOf(trimmed.toLowerCase());
  if (index === -1) return text;
  const before = text.substring(0, index);
  const match = text.substring(index, index + trimmed.length);
  const after = text.substring(index + trimmed.length);
  return (
    <>
      {before}
      <span className="font-bold text-orange-600 bg-orange-50 px-0.5 rounded-xs">{match}</span>
      {after}
    </>
  );
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  id,
  name,
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  emptyOptionLabel = 'None / Optional',
  disabled = false,
  hasError = false,
  ariaDescribedBy,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openUpward, setOpenUpward] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionsListRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  // Handle smart popover direction (check space below vs above)
  const handleOpen = () => {
    if (disabled) return;
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // If less than 240px below and more space above, open upward
      setOpenUpward(spaceBelow < 240 && spaceAbove > spaceBelow);
    }
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        setSearchQuery('');
        setHighlightedIndex(-1);
      }
      return next;
    });
  };

  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen) {
      const timer = window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen]);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, searchQuery]);

  // Reset highlight index when filter changes
  useEffect(() => {
    setHighlightedIndex(filteredOptions.length > 0 ? 0 : -1);
  }, [filteredOptions]);

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setIsOpen(false);
    setSearchQuery('');
    setHighlightedIndex(-1);
    triggerRef.current?.focus();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
    setHighlightedIndex(-1);
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleOpen();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setSearchQuery('');
      setHighlightedIndex(-1);
      triggerRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        setHighlightedIndex((prev) => (prev + 1) % filteredOptions.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        setHighlightedIndex((prev) => (prev - 1 + filteredOptions.length) % filteredOptions.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        handleSelect(filteredOptions[highlightedIndex]);
      } else if (filteredOptions.length > 0) {
        handleSelect(filteredOptions[0]);
      }
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Hidden input to support native form queries */}
      {name && <input type="hidden" name={name} value={value} />}

      {/* Main Trigger Box (No nested interactive elements!) */}
      <div
        className={`w-full h-8 px-2.5 border rounded-md text-xs bg-white flex items-center justify-between text-left transition-colors select-none ${
          hasError
            ? 'border-red-500 ring-1 ring-red-300'
            : isOpen
            ? 'border-slate-400 ring-1 ring-slate-200'
            : 'border-slate-200 hover:border-slate-300'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''}`}
      >
        <button
          ref={triggerRef}
          type="button"
          id={id}
          disabled={disabled}
          onClick={handleOpen}
          onKeyDown={handleTriggerKeyDown}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={isOpen && highlightedIndex >= 0 ? `${listboxId}-option-${highlightedIndex}` : undefined}
          aria-invalid={hasError}
          aria-describedby={ariaDescribedBy}
          className="flex-1 h-full min-w-0 flex items-center text-left truncate mr-2 cursor-pointer bg-transparent border-none outline-none focus:outline-none"
        >
          <span className={`truncate ${value ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
            {value || placeholder}
          </span>
        </button>

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              title="Clear selection"
              aria-label="Clear selection"
              className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}

          {/* Search button in dropdown trigger */}
          <button
            type="button"
            disabled={disabled}
            onClick={handleOpen}
            title="Search name"
            aria-label="Search name"
            className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={handleOpen}
            tabIndex={-1}
            aria-label={isOpen ? 'Close options' : 'Open options'}
            className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-150 ${isOpen ? 'rotate-180 text-slate-600' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={placeholder}
          className={`absolute left-0 right-0 z-50 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden flex flex-col ${
            openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
          style={{ maxHeight: '280px' }}
        >
          {/* Search Header */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/90 flex items-center gap-1.5 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              aria-autocomplete="list"
              aria-controls={listboxId}
              placeholder="Type name to search..."
              className="w-full text-xs bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-slate-800 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 shrink-0"
                title="Clear search text"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
                  handleSelect(filteredOptions[highlightedIndex]);
                } else if (filteredOptions.length > 0) {
                  handleSelect(filteredOptions[0]);
                }
              }}
              title="Search name"
              className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-medium rounded shrink-0 transition-colors"
            >
              Search
            </button>
          </div>

          {/* Options List */}
          <div ref={optionsListRef} className="overflow-y-auto py-1 max-h-48 text-xs divide-y divide-slate-50">
            {/* Empty / None Option */}
            <div
              id={`${listboxId}-option-empty`}
              role="option"
              aria-selected={!value}
              onClick={() => handleSelect('')}
              className={`px-3 py-1.5 flex items-center justify-between cursor-pointer transition-colors ${
                !value
                  ? 'bg-orange-50 text-orange-900 font-semibold'
                  : 'text-slate-500 hover:bg-slate-50 italic'
              }`}
            >
              <span>{emptyOptionLabel}</span>
              {!value && <Check className="w-3.5 h-3.5 text-orange-600 shrink-0" />}
            </div>

            {/* Filtered Options */}
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt === value;
                const isHighlighted = idx === highlightedIndex;
                return (
                  <div
                    key={opt}
                    id={`${listboxId}-option-${idx}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-3 py-1.5 flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-orange-50 text-orange-950 font-semibold'
                        : isHighlighted
                        ? 'bg-slate-100/90 text-slate-900'
                        : 'text-slate-800 hover:bg-slate-100/80'
                    }`}
                  >
                    <span className="truncate pr-2">{highlightMatch(opt, searchQuery)}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-orange-600 shrink-0" />}
                  </div>
                );
              })
            ) : (
              <div className="px-3 py-4 text-center text-xs text-slate-400">
                No names found matching &ldquo;<span className="font-semibold text-slate-600">{searchQuery}</span>&rdquo;
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="px-2.5 py-1 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between shrink-0">
            <span>
              {filteredOptions.length} of {options.length} {options.length === 1 ? 'person' : 'people'}
            </span>
            <span className="text-[9px] text-slate-400">ESC to close</span>
          </div>
        </div>
      )}
    </div>
  );
};
