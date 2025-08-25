import { useState, useMemo } from 'react';

interface UsePaginationProps<T> {
  items: T[];
  itemsPerPageMobile: number;
  itemsPerPageDesktop: number;
  isMobile: boolean;
}

export const usePagination = <T,>({ 
  items, 
  itemsPerPageMobile, 
  itemsPerPageDesktop,
  isMobile 
}: UsePaginationProps<T>) => {
  const [currentPage, setCurrentPage] = useState(1);
  
  const itemsPerPage = isMobile ? itemsPerPageMobile : itemsPerPageDesktop;
  
  const totalPages = Math.ceil(items.length / itemsPerPage);
  
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  }, [items, currentPage, itemsPerPage]);
  
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };
  
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  // Reset to page 1 when items change
  useMemo(() => {
    setCurrentPage(1);
  }, [items]);
  
  return {
    currentItems,
    currentPage,
    totalPages,
    itemsPerPage,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1
  };
};