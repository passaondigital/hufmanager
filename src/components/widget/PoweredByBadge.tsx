interface PoweredByBadgeProps {
  show: boolean;
}

export function PoweredByBadge({ show }: PoweredByBadgeProps) {
  if (!show) return null;

  return (
    <div className="flex justify-center pt-6 pb-2">
      <a
        href="https://hufmanager.de"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
      >
        <span>🐴</span>
        <span>Erstellt mit</span>
        <span className="font-medium text-primary">HufManager</span>
      </a>
    </div>
  );
}
