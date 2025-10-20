'use client';

interface QuickReplyButtonProps {
  text: string;
  icon?: string;
  onClick: () => void;
}

export default function QuickReplyButton({ text, icon, onClick }: QuickReplyButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg border border-slate-600 hover:border-primary/50 text-sm font-medium"
    >
      {icon && <span>{icon}</span>}
      <span>{text}</span>
    </button>
  );
}
