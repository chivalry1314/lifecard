import { createContext, useContext } from "react";

type NotificationType = "success" | "error" | "info";

export interface NotificationContextValue {
  notify: (
    type: NotificationType,
    title: string,
    description?: string
  ) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

export const NotificationContext = createContext<NotificationContextValue | null>(
  null
);

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      "useNotification must be used within NotificationProvider"
    );
  }
  return ctx;
}
