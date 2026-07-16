import { cn } from "@/lib/utils";

interface LoadingScreenProps {
  text?: string;
  className?: string;
}

export function LoadingScreen({ text = "Loading...", className }: LoadingScreenProps) {
  return (
    <div className={cn("flex flex-col min-h-[50vh] h-full items-center justify-center bg-background", className)}>
      <img 
        src="/logo.png" 
        alt="Loading Logo" 
        className="w-[150px] h-auto animate-[pulse_2s_ease-in-out_infinite]"
        style={{ willChange: 'transform, opacity' }} 
      />
      <div className="mt-6 text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wider uppercase font-sans">
        {text}
      </div>
    </div>
  );
}
