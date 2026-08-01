export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

/**
 * The concrete SMTP transport remains provider-neutral so Mailrelay credentials
 * can be rotated without coupling the application to a vendor-specific SDK.
 * Phase 0 defines only the boundary required by the worker.
 */
export interface MailDelivery {
  send(message: MailMessage): Promise<{ providerMessageId: string }>;
}
