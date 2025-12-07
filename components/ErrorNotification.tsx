// components/ErrorNotification.tsx
"use client";

import { useEffect, useState } from "react";
import type { ValidationError } from "@/lib/drill/validation";

type Notification = {
  id: string;
  type: "error" | "warning" | "success" | "info";
  message: string;
  details?: string;
  timestamp: Date;
};

type ErrorNotificationContextType = {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, "id" | "timestamp">) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
};

// グローバルな通知管理（シンプルな実装）
let notificationListeners: ((notifications: Notification[]) => void)[] = [];
let globalNotifications: Notification[] = [];

export function addGlobalNotification(notification: Omit<Notification, "id" | "timestamp">) {
  const newNotification: Notification = {
    ...notification,
    id: Math.random().toString(36).substring(7),
    timestamp: new Date(),
  };
  globalNotifications = [...globalNotifications, newNotification];
  notificationListeners.forEach((listener) => listener(globalNotifications));

  // 自動削除（エラーと警告は10秒、成功と情報は2秒）
  const autoRemoveDelay = notification.type === "error" || notification.type === "warning" ? 10000 : 2000;
  setTimeout(() => {
    removeGlobalNotification(newNotification.id);
  }, autoRemoveDelay);
}

export function removeGlobalNotification(id: string) {
  globalNotifications = globalNotifications.filter((n) => n.id !== id);
  notificationListeners.forEach((listener) => listener(globalNotifications));
}

export function clearGlobalNotifications() {
  globalNotifications = [];
  notificationListeners.forEach((listener) => listener(globalNotifications));
}

export function useErrorNotification() {
  const [notifications, setNotifications] = useState<Notification[]>(globalNotifications);

  useEffect(() => {
    const listener = (newNotifications: Notification[]) => {
      setNotifications(newNotifications);
    };
    notificationListeners.push(listener);
    setNotifications(globalNotifications);

    return () => {
      notificationListeners = notificationListeners.filter((l) => l !== listener);
    };
  }, []);

  return {
    notifications,
    addNotification: addGlobalNotification,
    removeNotification: removeGlobalNotification,
    clearAll: clearGlobalNotifications,
  };
}

export default function ErrorNotification() {
  const { notifications, removeNotification } = useErrorNotification();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-md">
      {notifications.map((notification) => {
        const bgColor =
          notification.type === "error"
            ? "bg-red-900/90 border-red-500"
            : notification.type === "warning"
            ? "bg-yellow-900/90 border-yellow-500"
            : notification.type === "success"
            ? "bg-emerald-900/90 border-emerald-500"
            : "bg-blue-900/90 border-blue-500";

        const textColor =
          notification.type === "error"
            ? "text-red-200"
            : notification.type === "warning"
            ? "text-yellow-200"
            : notification.type === "success"
            ? "text-emerald-200"
            : "text-blue-200";

        return (
          <div
            key={notification.id}
            className={`${bgColor} ${textColor} border rounded-lg p-4 shadow-xl backdrop-blur-sm animate-in slide-in-from-right`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">
                    {notification.type === "error"
                      ? "❌"
                      : notification.type === "warning"
                      ? "⚠️"
                      : notification.type === "success"
                      ? "✅"
                      : "ℹ️"}
                  </span>
                  <p className="font-medium">{notification.message}</p>
                </div>
                {notification.details && (
                  <p className="text-xs opacity-80 mt-1">{notification.details}</p>
                )}
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="text-current opacity-60 hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * バリデーションエラーを通知に変換
 */
export function showValidationErrors(errors: ValidationError[], warnings: ValidationError[]) {
  errors.forEach((error) => {
    addGlobalNotification({
      type: "error",
      message: error.message,
      details: error.field,
    });
  });

  warnings.forEach((warning) => {
    addGlobalNotification({
      type: "warning",
      message: warning.message,
      details: warning.field,
    });
  });
}


