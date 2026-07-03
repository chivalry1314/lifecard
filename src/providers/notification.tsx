import {
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CircleCheck, CircleX, Info } from "lucide-react";
import { NotificationContext } from "./notification-context";

type NotificationType = "success" | "error" | "info";

interface Notification {
  open: boolean;
  type: NotificationType;
  title: string;
  description?: string;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notification, setNotification] = useState<Notification | null>(null);

  const notify = useCallback(
    (type: NotificationType, title: string, description?: string) => {
      setNotification({ open: true, type, title, description });
    },
    []
  );

  const success = useCallback(
    (title: string, description?: string) => {
      notify("success", title, description);
    },
    [notify]
  );

  const error = useCallback(
    (title: string, description?: string) => {
      notify("error", title, description);
    },
    [notify]
  );

  const info = useCallback(
    (title: string, description?: string) => {
      notify("info", title, description);
    },
    [notify]
  );

  const close = useCallback(() => {
    setNotification((prev) => (prev ? { ...prev, open: false } : null));
  }, []);

  const icon =
    notification?.type === "success" ? (
      <CircleCheck className="w-8 h-8 text-green-400" />
    ) : notification?.type === "error" ? (
      <CircleX className="w-8 h-8 text-red-400" />
    ) : (
      <Info className="w-8 h-8 text-amber-400" />
    );

  return (
    <NotificationContext.Provider value={{ notify, success, error, info }}>
      {children}
      <Dialog open={notification?.open ?? false} onOpenChange={close}>
        <DialogContent className="bg-slate-800 border-amber-800/30 text-amber-100 max-w-sm">
          <DialogHeader className="items-center text-center">
            <div className="mb-2">{icon}</div>
            <DialogTitle className="text-amber-100 text-xl">
              {notification?.title}
            </DialogTitle>
            {notification?.description && (
              <DialogDescription className="text-amber-200/70">
                {notification.description}
              </DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter className="justify-center sm:justify-center">
            <Button
              onClick={close}
              className="bg-amber-600 hover:bg-amber-700 min-w-[100px]"
            >
              知道了
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </NotificationContext.Provider>
  );
}
