import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading org chart">
      <Skeleton className="mb-6 h-8 w-64" />
      <Skeleton className="h-96" />
    </div>
  );
}