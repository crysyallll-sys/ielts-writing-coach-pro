export default function Skeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Question skeleton */}
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-16"></div>
        <div className="h-32 bg-gray-200 rounded-xl"></div>
      </div>

      {/* Answer skeleton */}
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-20"></div>
        <div className="h-64 bg-gray-200 rounded-xl"></div>
      </div>

      {/* Word count skeleton */}
      <div className="h-4 bg-gray-200 rounded w-24 ml-auto"></div>

      {/* Button skeleton */}
      <div className="h-14 bg-gray-200 rounded-xl"></div>
    </div>
  );
}