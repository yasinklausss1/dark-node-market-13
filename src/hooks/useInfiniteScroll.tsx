import { useState, useEffect, useRef, useCallback } from 'react';

interface UseInfiniteScrollProps<T> {
  items: T[];
  itemsPerPage?: number;
  threshold?: number;
}

export const useInfiniteScroll = <T,>({ 
  items, 
  itemsPerPage = 20, 
  threshold = 100 
}: UseInfiniteScrollProps<T>) => {
  const [displayedItems, setDisplayedItems] = useState<T[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  // Load more items
  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;

    setLoading(true);
    setTimeout(() => {
      const currentLength = displayedItems.length;
      const nextItems = items.slice(currentLength, currentLength + itemsPerPage);
      
      setDisplayedItems(prev => [...prev, ...nextItems]);
      setHasMore(currentLength + nextItems.length < items.length);
      setLoading(false);
    }, 100); // Small delay to prevent rapid loading
  }, [items, displayedItems.length, itemsPerPage, loading, hasMore]);

  // Reset when items change
  useEffect(() => {
    setDisplayedItems(items.slice(0, itemsPerPage));
    setHasMore(items.length > itemsPerPage);
  }, [items, itemsPerPage]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = observerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, loading, loadMore]);

  return {
    displayedItems,
    hasMore,
    loading,
    observerRef,
    loadMore
  };
};