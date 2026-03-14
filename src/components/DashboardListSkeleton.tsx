/**
 * Server component used by dashboard route loading.tsx (all, movies, series) for instant transition feedback.
 * Matches the grid layout and padding of All/Movies/Series so the transition doesn’t jump.
 */
export default function DashboardListSkeleton() {
  return (
    <div className="p-4 md:p-6">
      <div className="grid gap-3 md:gap-4 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[2/3] rounded-xl bg-shelf-border" />
          </div>
        ))}
      </div>
    </div>
  );
}
