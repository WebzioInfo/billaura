import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { useHelpStore } from '@/stores/helpStore';

interface DocTooltipProps {
  title: string;
  description: string;
  articleId?: string;
}

export function DocTooltip({ title, description, articleId }: DocTooltipProps) {
  const { openHelp } = useHelpStore();
  const [show, setShow] = useState(false);

  return (
    <div 
      className="relative inline-flex items-center ml-1"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-accent cursor-help transition-colors" />
      
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-foreground text-background text-xs rounded-lg shadow-xl z-50">
          <div className="font-bold mb-1">{title}</div>
          <div className="text-background/80 mb-2">{description}</div>
          {articleId && (
            <button 
              onClick={() => {
                setShow(false);
                openHelp(articleId);
              }}
              className="text-accent hover:underline font-semibold"
            >
              Read full guide
            </button>
          )}
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground"></div>
        </div>
      )}
    </div>
  );
}
