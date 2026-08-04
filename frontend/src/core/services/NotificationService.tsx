import React from 'react';
import toast, { type ToastOptions } from "react-hot-toast";
import { CheckCircle2, AlertTriangle, XCircle, Info, Loader2 } from 'lucide-react';

type NotificationKind = "success" | "error" | "warning" | "info" | "loading";
type NotificationOptions = ToastOptions & { id?: string; persistent?: boolean; title?: string };

// Custom Toast Component
interface CustomToastProps {
  t: any;
  kind: NotificationKind;
  title?: string;
  description: string;
}

const CustomToast: React.FC<CustomToastProps> = ({ t, kind, title, description }) => {
  const getIcon = () => {
    switch (kind) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />;
      case 'loading':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />;
    }
  };

  const getBorderColor = () => {
    switch (kind) {
      case 'success': return 'border-green-500/20 bg-green-500/5';
      case 'error': return 'border-red-500/20 bg-red-500/5';
      case 'warning': return 'border-amber-500/20 bg-amber-500/5';
      case 'info': return 'border-blue-500/20 bg-blue-500/5';
      case 'loading': return 'border-slate-500/20 bg-slate-500/5';
    }
  };

  const defaultTitle = kind.charAt(0).toUpperCase() + kind.slice(1);

  return (
    <div
      className={`max-w-md w-full bg-surface border ${getBorderColor()} shadow-premium rounded-2xl pointer-events-auto flex ring-1 ring-black/5 p-4 transition-all duration-300 ${
        t.visible ? 'animate-in fade-in slide-in-from-top-4' : 'animate-out fade-out'
      }`}
    >
      <div className="flex items-start gap-3 w-full">
        {getIcon()}
        <div className="flex-1 text-left">
          <p className="text-sm font-bold text-foreground">{title || defaultTitle}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
          <span className="text-[10px] text-muted-foreground/60 block mt-2 font-mono">
            {new Date().toLocaleTimeString()}
          </span>
        </div>
        <button
          onClick={() => toast.dismiss(t.id)}
          className="text-muted-foreground hover:text-foreground text-xs font-semibold cursor-pointer px-1.5 py-0.5 rounded hover:bg-muted"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

const duration: Record<Exclude<NotificationKind, "loading">, number> = {
  success: 4_000,
  error: 6_000,
  warning: 5_000,
  info: 4_000,
};

function publish(kind: NotificationKind, message: any, options: NotificationOptions = {}): string {
  let safeMessage = "Request could not be completed.";
  
  if (typeof message === 'string') {
    safeMessage = message.trim() || safeMessage;
  } else if (message instanceof Error) {
    safeMessage = message.message;
  } else if (typeof message === 'object' && message !== null) {
    if (message.message && typeof message.message === 'string') {
      safeMessage = message.message;
    } else {
      try {
        safeMessage = JSON.stringify(message);
      } catch (e) {
        safeMessage = "An unknown error occurred.";
      }
    }
  }
  
  return toast.custom(
    (t) => (
      <CustomToast
        t={t}
        kind={kind}
        title={options.title}
        description={safeMessage}
      />
    ),
    {
      id: options.id,
      duration: options.persistent || kind === "loading" ? Infinity : duration[kind as Exclude<NotificationKind, "loading">],
    }
  );
}

const notification = {
  success: (message: any, options?: NotificationOptions) => publish("success", message, options),
  error: (message: any, options?: NotificationOptions) => publish("error", message, options),
  warning: (message: any, options?: NotificationOptions) => publish("warning", message, options),
  info: (message: any, options?: NotificationOptions) => publish("info", message, options),
  loading: (message: any, options?: NotificationOptions) => publish("loading", message, options),
  progress: (id: string, message: any, completed?: boolean) => publish(completed ? "success" : "loading", message, { id, persistent: !completed }),
  update: (id: string, kind: Exclude<NotificationKind, "loading">, message: any, options?: NotificationOptions) => publish(kind, message, { ...options, id }),
  promise: async <T extends unknown>(promise: Promise<T>, messages: { loading: string; success: string | ((data: T) => string); error: string | ((error: unknown) => string) }, options?: NotificationOptions): Promise<T> => {
    const id = publish("loading", messages.loading, options);
    try {
      const result = await promise;
      publish("success", typeof messages.success === "function" ? messages.success(result) : messages.success, { ...options, id });
      return result;
    } catch (error) {
      publish("error", typeof messages.error === "function" ? messages.error(error) : messages.error, { ...options, id });
      throw error;
    }
  },
  dismiss: (id?: string) => toast.dismiss(id),
  clearAll: () => toast.dismiss(),
};

export default notification;
