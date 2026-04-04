import { useCallback } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  getDesktopNotificationPermission,
  requestDesktopNotificationPermission,
  useNotificationSettings,
} from "@/hooks/useNotificationSettings";

interface NotificationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationsDialog({ open, onOpenChange }: NotificationsDialogProps) {
  const { settings, setSettings } = useNotificationSettings();
  const permission = getDesktopNotificationPermission();

  const handleDesktopToggle = useCallback(async () => {
    const next = !settings.desktop;
    if (!next) {
      setSettings({ desktop: false });
      return;
    }
    const result = await requestDesktopNotificationPermission();
    setSettings({ desktop: result === "granted" });
  }, [setSettings, settings.desktop]);

  const handleSoundToggle = useCallback(() => {
    setSettings({ sound: !settings.sound });
  }, [setSettings, settings.sound]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose onClose={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle>Notifications</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between border border-border bg-card/50 px-3 py-2">
            <div>
              <p className="text-sm font-medium">Desktop notifications</p>
              <p className="text-xs text-muted-foreground">
                Browser and OS alerts when a task changes status
              </p>
            </div>
            <Button
              variant="outline"
              size="xs"
              onClick={() => void handleDesktopToggle()}
              className="min-w-16"
            >
              {settings.desktop ? "ON" : "OFF"}
            </Button>
          </div>

          <div className="flex items-center justify-between border border-border bg-card/50 px-3 py-2">
            <div>
              <p className="text-sm font-medium">Sound</p>
              <p className="text-xs text-muted-foreground">
                Play a short sound on task status change
              </p>
            </div>
            <Button variant="outline" size="xs" onClick={handleSoundToggle} className="min-w-16">
              {settings.sound ? "ON" : "OFF"}
            </Button>
          </div>

          {permission === "unsupported" && (
            <p className="text-xs text-amber-400">
              This browser does not support desktop notifications.
            </p>
          )}
          {permission === "denied" && (
            <p className="text-xs text-amber-400">
              Desktop notifications are blocked in browser settings.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
