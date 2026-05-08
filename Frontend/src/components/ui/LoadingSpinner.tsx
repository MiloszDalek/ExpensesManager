export function LoadingSpinner({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-spin rounded-full border-2 border-primary/20 border-t-primary ${className}`} />
  );
}

export function LoadingSpinnerWrapper({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <LoadingSpinner className="h-12 w-12" />
    </div>
  );
}
