"use client";

import { Button } from "@/components/ui/button";

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <h2 className="text-lg font-semibold">Couldn&apos;t load the dashboard</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Something went wrong while fetching your data. Please try again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}