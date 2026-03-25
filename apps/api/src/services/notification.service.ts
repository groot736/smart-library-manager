type NotificationPayload = {
  to: string;
  subject: string;
  message: string;
  channel?: "email" | "sms";
};

export const sendNotification = async (payload: NotificationPayload) => {
  const channel = payload.channel ?? "email";
  return {
    success: true,
    channel,
    to: payload.to,
    preview: `[SIMULATED ${channel.toUpperCase()}] ${payload.subject}: ${payload.message}`,
  };
};
