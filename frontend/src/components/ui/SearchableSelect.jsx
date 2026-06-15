import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

const SearchableSelect = ({
  options = [],
  value,
  onChange,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  label,
  icon: Icon,
  maxVisible = 5,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  const selectedLabel = options.find((o) => o.value === value)?.label || placeholder;

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) setSearch('');
  }, [isOpen]);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
    setSearch('');
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen((v) => !v)}
        disabled={disabled}
        className={`w-full flex items-center gap-2 pl-3 pr-2 py-2.5 border rounded-lg bg-white dark:bg-[#131A2C] text-left transition-all ${
          isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20 dark:ring-blue-500/40'
            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {Icon && <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />}
        <span className={`text-sm font-medium truncate flex-1 ${value ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>
          {selectedLabel}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={clear}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { clear(e); } }}
              className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer inline-flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-lg shadow-card overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800/80">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                autoFocus
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-md bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Options */}
          <div className="max-h-[200px] overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-slate-400 dark:text-slate-500">
                Sin coincidencias
              </div>
            ) : (
              filteredOptions.slice(0, maxVisible * 3).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${
                    opt.value === value
                      ? 'bg-blue-50 dark:bg-blue-900/25 text-blue-700 dark:text-blue-400 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {opt.value === value && (
                    <span className="w-2 h-2 bg-blue-600 rounded-full shrink-0 ml-2" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
