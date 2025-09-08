import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { SERVICE_JOB_CONFIGS } from '@/types/processing';

// Skeleton loading component that matches the results layout
export default function ResultsLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-4" />
          <div className="h-8 w-80 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
        </div>

        {/* Navigation and Export Button Skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex space-x-1">
            <div className="h-9 w-24 bg-gray-200 rounded-md animate-pulse" />
            <div className="h-9 w-28 bg-gray-200 rounded-md animate-pulse" />
            <div className="h-9 w-20 bg-gray-200 rounded-md animate-pulse" />
          </div>
          <div className="h-9 w-32 bg-gray-200 rounded-md animate-pulse" />
        </div>

        {/* Main Content Skeleton */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="h-6 w-64 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="h-5 w-20 bg-gray-200 rounded-full animate-pulse" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Processing Progress Skeleton */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="h-2 w-full bg-gray-200 rounded-full animate-pulse" />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="h-5 w-5 bg-gray-200 rounded-full animate-pulse flex-shrink-0" />
                    <div className="flex-1">
                      <div className="h-4 w-full bg-gray-200 rounded animate-pulse mb-1" />
                      <div className="h-3 w-3/4 bg-gray-200 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Results Content Skeleton */}
            <div className="mt-8 space-y-4">
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
              
              {/* Summary Items Skeleton */}
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-4/5 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>

            {/* Comparison or Conflict Skeleton (service-specific) */}
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="h-5 w-36 bg-gray-200 rounded animate-pulse" />
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                  ))}
                </div>
              </div>
            </div>

            {/* Quality Indicators Skeleton */}
            <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="h-6 w-12 bg-gray-200 rounded animate-pulse mx-auto mb-2" />
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mx-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer Actions Skeleton */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <div className="h-10 w-32 bg-gray-200 rounded-md animate-pulse" />
          <div className="h-10 w-28 bg-gray-200 rounded-md animate-pulse" />
          <div className="h-10 w-36 bg-gray-200 rounded-md animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// Progressive loading for specific service types
export function RingkasanLoading() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-64 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary sections skeleton */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-4/5 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function PerubahanLoading() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-72 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-4 w-56 bg-gray-200 rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Before/After comparison skeleton */}
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-4">
              <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Diff highlights skeleton */}
        <div className="mt-8 space-y-4">
          <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 border-l-4 border-gray-200 bg-gray-50 space-y-2">
              <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function KonflikLoading() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-64 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-4 w-52 bg-gray-200 rounded animate-pulse" />
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Conflict items skeleton */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 border border-red-200 bg-red-50/50 rounded-lg space-y-3">
            <div className="flex items-start justify-between">
              <div className="h-5 w-48 bg-red-200 rounded animate-pulse" />
              <div className="h-5 w-16 bg-red-200 rounded-full animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-red-200 rounded animate-pulse" />
              <div className="h-4 w-4/5 bg-red-200 rounded animate-pulse" />
            </div>
            <div className="h-4 w-32 bg-red-200 rounded animate-pulse" />
          </div>
        ))}

        {/* Recommendations skeleton */}
        <div className="mt-8 space-y-4">
          <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="h-4 w-full bg-green-200 rounded animate-pulse mb-2" />
                <div className="h-3 w-3/4 bg-green-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}