import { useCallback, useMemo, useSyncExternalStore } from "react";
import { STORAGE_KEYS } from "../lib/storageKeys.js";
import { createExternalStore } from "../lib/createExternalStore.js";

export interface NotificationSettings {
  desktop: boolean;
  sound: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  desktop: false,
  sound: false,
};

const store = createExternalStore<NotificationSettings>(
  STORAGE_KEYS.NOTIFICATION_SETTINGS,
  DEFAULT_SETTINGS,
);

export function requestDesktopNotificationPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return Promise.resolve("unsupported");
  }
  return Notification.requestPermission();
}

export function getDesktopNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return "unsupported";
  }
  return Notification.permission;
}

export function useNotificationSettings() {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const settings = useMemo(() => {
    try {
      return JSON.parse(snapshot) as NotificationSettings;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }, [snapshot]);

  const setSettings = useCallback((partial: Partial<NotificationSettings>) => {
    store.update(partial);
  }, []);

  return { settings, setSettings };
}
