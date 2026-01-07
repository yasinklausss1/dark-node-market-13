import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const ProductCardSkeleton: React.FC = () => {
  return (
    <Card className="overflow-hidden bg-card border-border">
      {/* Image Skeleton */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <Skeleton className="w-full h-full" />
      </div>

      {/* Content Section */}
      <CardHeader className="p-4 pb-2 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        
        {/* Rating Skeleton */}
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-6" />
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 space-y-3">
        {/* Price Skeleton */}
        <Skeleton className="h-6 w-20" />

        {/* Button Skeleton */}
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
};

interface ProductGridSkeletonProps {
  count?: number;
  mobileGridCols?: 1 | 2;
}

export const ProductGridSkeleton: React.FC<ProductGridSkeletonProps> = ({ 
  count = 12,
  mobileGridCols = 2 
}) => {
  return (
    <div className={`grid ${mobileGridCols === 1 ? 'grid-cols-1' : 'grid-cols-2'} md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6`}>
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
};
