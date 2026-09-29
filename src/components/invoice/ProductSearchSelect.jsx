import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X } from 'lucide-react';

export default function ProductSearchSelect({
  value,
  productName = '',
  onChange,
  products = [],
  batches = {},
  disabled = false,
  placeholder = 'بحث باسم المنتج...',
  inputClass = '',
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  const selectedProduct = useMemo(() => {
    if (value == null || value === '') return null;
    return products.find((p) => String(p.id) === String(value));
  }, [products, value]);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const term = search.toLowerCase();
    return products.filter((p) => p.name?.toLowerCase().includes(term));
  }, [products, search]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayValue = open
    ? search
    : (selectedProduct ? selectedProduct.name : (productName || search || ''));

  const baseInputClass = inputClass || 'w-full px-3 py-2 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-sm text-charcoal-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all';

  const hasValue = Boolean(value || productName);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          disabled={disabled}
          value={displayValue}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
            if (!e.target.value) {
              onChange('', null);
            }
          }}
          onFocus={() => {
            if (!disabled) {
              setOpen(true);
              setSearch(selectedProduct ? selectedProduct.name : (productName || ''));
            }
          }}
          placeholder={placeholder}
          className={`${baseInputClass} pr-8 cursor-text text-sm font-medium disabled:opacity-50`}
          dir="rtl"
          autoComplete="off"
        />
        {hasValue && !disabled && (
          <button
            type="button"
            onClick={() => {
              onChange('', null);
              setSearch('');
              setOpen(true);
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-steel hover:text-charcoal-ink p-1 rounded-full hover:bg-surface-container-low transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && !disabled && (
        <div
          className="absolute z-50 top-full mt-1 w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-2xl max-h-56 overflow-y-auto py-1"
          style={{ backgroundColor: 'var(--color-surface-container-lowest, #ffffff)' }}
        >
          {filteredProducts.length === 0 ? (
            <div className="px-4 py-2.5 text-sm text-muted-steel text-center">
              لا توجد نتائج
            </div>
          ) : (
            filteredProducts.map((p) => {
              const pBatches = batches?.[p.id] || [];
              const totalRemaining = pBatches.reduce((acc, b) => acc + Number(b.remaining_quantity || 0), 0);
              const isSelected = String(p.id) === String(value) || p.name === productName;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onChange(String(p.id), p);
                    setSearch(p.name);
                    setOpen(false);
                  }}
                  className={`w-full text-right px-4 py-2 text-sm hover:bg-surface-container-low transition-colors flex items-center justify-between ${
                    isSelected ? 'bg-accent-surface text-accent font-semibold' : 'text-charcoal-ink'
                  }`}
                >
                  <span className="truncate">{p.name}</span>
                  <span className="text-xs text-muted-steel font-mono-tabular shrink-0 mr-2">
                    متاح: {totalRemaining.toFixed(2)}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
