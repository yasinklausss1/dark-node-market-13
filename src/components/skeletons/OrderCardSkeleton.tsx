import { Skeleton } from "@/components/ui/skeleton";

export const OrderCardSkeleton = () => {
  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="text-right space-y-2">
          <Skeleton className="h-6 w-20 ml-auto" />
          <Skeleton className="h-5 w-24 ml-auto" />
        </div>
      </div>
      
      <Skeleton className="h-16 w-full" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    </div>
  );
};
