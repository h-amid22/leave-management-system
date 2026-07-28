export type NotificationChannel = "email" | "in_app" | "sms" | "slack" | "teams";

export interface Notification {
  recipientUserId: string;
  template: string;
  channels: NotificationChannel[];
  variables: Record<string, string | number | boolean>;
}

export interface NotificationService {
  send(notification: Notification): Promise<void>;
}

export const queuedNotificationService: NotificationService = {
  async send() {
    // A durable job adapter will own delivery, retries, and dead-letter handling.
  },
};
