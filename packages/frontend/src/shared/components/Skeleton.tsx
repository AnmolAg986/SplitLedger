

interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className = '' }: SkeletonProps) => {
  return (
    <div className={`animate-pulse bg-white/10 rounded-md ${className}`} />
  );
};

// Common Skeletons

export const DashboardWidgetSkeleton = () => (
  <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl p-6 shadow-xl w-full flex flex-col gap-4">
    <div className="flex justify-between items-center">
      <Skeleton className="w-32 h-5 rounded-lg" />
      <Skeleton className="w-8 h-8 rounded-full" />
    </div>
    <div className="flex items-end gap-3 mt-2">
      <Skeleton className="w-24 h-10 rounded-xl" />
      <Skeleton className="w-16 h-4 mb-2 rounded-md" />
    </div>
    <Skeleton className="w-full h-1 mt-4 rounded-full" />
  </div>
);

export const ListCardSkeleton = () => (
  <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 shadow-xl flex flex-col gap-4 w-full">
    <div className="flex justify-between items-start">
      <Skeleton className="w-16 h-16 rounded-2xl" />
      <Skeleton className="w-16 h-6 rounded-full" />
    </div>
    <div className="flex flex-col gap-2 mt-2">
      <Skeleton className="w-3/4 h-6 rounded-lg" />
      <Skeleton className="w-1/2 h-4 rounded-md" />
    </div>
  </div>
);

export const ExpenseRowSkeleton = () => (
  <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] flex flex-col gap-3 w-full">
    <div className="flex justify-between items-start">
      <Skeleton className="w-1/2 h-5 rounded-md" />
      <Skeleton className="w-16 h-6 rounded-lg" />
    </div>
    <div className="flex justify-between items-center">
      <Skeleton className="w-24 h-3 rounded-sm" />
      <Skeleton className="w-20 h-3 rounded-sm" />
    </div>
  </div>
);

export const ChatMessageSkeleton = ({ isOwn = false }: { isOwn?: boolean }) => (
  <div className={`flex w-full ${isOwn ? 'justify-end' : 'justify-start'}`}>
    {!isOwn && <Skeleton className="w-8 h-8 rounded-full mr-2 shrink-0" />}
    <div className={`flex flex-col gap-1 max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
      {!isOwn && <Skeleton className="w-20 h-3 rounded-sm mb-1" />}
      <Skeleton className={`h-10 rounded-2xl ${isOwn ? 'w-48 rounded-tr-sm' : 'w-56 rounded-tl-sm'}`} />
    </div>
  </div>
);
