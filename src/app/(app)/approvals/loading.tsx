import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading approvals">
      <Skeleton className="mb-6 h-8 w-48" />
      <Skeleton className="h-72" />
    </div>
  );
}