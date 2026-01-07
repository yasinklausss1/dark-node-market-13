import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Package, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  title: string;
  price: number;
  image_url: string | null;
  product_type: string;
}

interface SearchAutocompleteProps {
  products: SearchResult[];
  value: string;
  onChange: (value: string) => void;
  onSelectProduct?: (productId: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchAutocomplete: React.FC<SearchAutocompleteProps> = ({
  products,
  value,
  onChange,
  onSelectProduct,
  placeholder = "Produkte suchen...",
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter products based on search term
  const filterProducts = useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSuggestions([]);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = products
      .filter(product => 
        product.title.toLowerCase().includes(term)
      )
      .slice(0, 8); // Limit to 8 suggestions

    setSuggestions(filtered);
  }, [products]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      filterProducts(value);
    }, 150);

    return () => clearTimeout(timer);
  }, [value, filterProducts]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleSelectSuggestion = (product: SearchResult) => {
    if (onSelectProduct) {
      onSelectProduct(product.id);
    }
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          handleSelectSuggestion(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const clearSearch = () => {
    onChange('');
    setSuggestions([]);
    inputRef.current?.focus();
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onFocus={() => value && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10 h-12"
        />
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
            onClick={clearSearch}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
        >
          <div className="max-h-80 overflow-y-auto">
            {suggestions.map((product, index) => (
              <button
                key={product.id}
                type="button"
                className={cn(
                  "w-full flex items-center gap-3 p-3 text-left transition-colors",
                  "hover:bg-accent focus:bg-accent outline-none",
                  highlightedIndex === index && "bg-accent"
                )}
                onClick={() => handleSelectSuggestion(product)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                {/* Product Image */}
                <div className="w-10 h-10 rounded-md overflow-hidden bg-muted flex-shrink-0">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {product.product_type === 'digital' ? (
                        <Download className="h-4 w-4 text-muted-foreground/50" />
                      ) : (
                        <Package className="h-4 w-4 text-muted-foreground/50" />
                      )}
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {product.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    €{product.price.toFixed(2)}
                  </p>
                </div>

                {/* Product Type Badge */}
                <div className="flex-shrink-0">
                  {product.product_type === 'digital' ? (
                    <Download className="h-4 w-4 text-primary" />
                  ) : (
                    <Package className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No results message */}
      {isOpen && value.length >= 2 && suggestions.length === 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg p-4"
        >
          <p className="text-sm text-muted-foreground text-center">
            Keine Produkte gefunden
          </p>
        </div>
      )}
    </div>
  );
};
