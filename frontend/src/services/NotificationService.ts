import toast, { type ToastOptions } from "react-hot-toast";

type NotificationKind = "success" | "error" | "warning" | "info" | "loading";
type NotificationOptions = ToastOptions & { id?: string; persistent?: boolean };

const duration: Record<Exclude<NotificationKind, "loading">, number> = {
  success: 4_000,
  error: 6_000,
  warning: 5_000,
  info: 4_000,
};

const styleByKind: Record<NotificationKind, ToastOptions["style"]> = {
  success: { borderColor: "#bbf7d0" },
  error: { borderColor: "#fecaca" },
  warning: { borderColor: "#fde68a" },
  info: { borderColor: "#bfdbfe" },
  loading: { borderColor: "#cbd5e1" },
};

function publish(kind: NotificationKind, message: string, options: NotificationOptions = {}): string {
  const safeMessage = message.trim() || "Request could not be completed.";
  const config: ToastOptions = {
    id: options.id,
    duration: options.persistent || kind === "loading" ? Infinity : duration[kind as Exclude<NotificationKind, "loading">],
    icon: null,
    style: { ...styleByKind[kind], ...options.style },
    ariaProps: { role: kind === "error" ? "alert" : "status", "aria-live": kind === "error" ? "assertive" : "polite" },
    ...options,
  };
  return kind === "loading" ? toast.loading(safeMessage, config) : toast(safeMessage, config);
}

const notification = {
  success: (message: string, options?: NotificationOptions) => publish("success", message, options),
  error: (message: string, options?: NotificationOptions) => publish("error", message, options),
  warning: (message: string, options?: NotificationOptions) => publish("warning", message, options),
  info: (message: string, options?: NotificationOptions) => publish("info", message, options),
  loading: (message: string, options?: NotificationOptions) => publish("loading", message, options),
  progress: (id: string, message: string, completed?: boolean) => publish(completed ? "success" : "loading", message, { id, persistent: !completed }),
  update: (id: string, kind: Exclude<NotificationKind, "loading">, message: string, options?: NotificationOptions) => publish(kind, message, { ...options, id }),
  promise: async <T>(promise: Promise<T>, messages: { loading: string; success: string | ((data: T) => string); error: string | ((error: unknown) => string) }, options?: NotificationOptions): Promise<T> => {
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
