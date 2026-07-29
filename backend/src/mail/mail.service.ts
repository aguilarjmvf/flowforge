import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    if (!host) {
      this.logger.warn('SMTP_HOST not set — email sending is disabled');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: this.config.get<number>('SMTP_PORT') ?? 587,
      secure: this.config.get<string>('SMTP_SECURE') === 'true',
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
    });
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) return;

    const from = this.config.get<string>('SMTP_FROM') ?? 'FlowForge <noreply@flowforge.app>';
    try {
      await this.transporter.sendMail({ from, to, subject, html });
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${(err as Error).message}`);
    }
  }

  taskAssigned(to: string, recipientName: string, referenceNumber: string, stepName: string): Promise<void> {
    return this.send(
      to,
      `New Task Assigned — ${referenceNumber}`,
      emailLayout(
        'New Task Assigned',
        `<p>Hi ${recipientName},</p>
         <p>You have been assigned a new task:</p>
         <p style="font-size:16px;font-weight:bold;color:#1d4ed8;">${stepName}</p>
         <p>Request Reference: <strong>${referenceNumber}</strong></p>
         <p>Log in to FlowForge to review and action this task.</p>`,
      ),
    );
  }

  workflowStatusChanged(
    to: string,
    recipientName: string,
    referenceNumber: string,
    title: string,
    statusLabel: string,
    color: string,
  ): Promise<void> {
    return this.send(
      to,
      `Request ${statusLabel} — ${referenceNumber}`,
      emailLayout(
        `Request ${statusLabel}`,
        `<p>Hi ${recipientName},</p>
         <p>Your request has been <strong style="color:${color};">${statusLabel.toLowerCase()}</strong>.</p>
         <p>Request: <strong>${title}</strong> (${referenceNumber})</p>
         <p>Log in to FlowForge to view the full status and any comments.</p>`,
      ),
    );
  }
}

function emailLayout(heading: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:Arial,sans-serif;background:#f3f4f6;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.1);">
    <div style="background:#1d4ed8;padding:20px 28px;">
      <span style="color:#fff;font-size:18px;font-weight:bold;">FlowForge</span>
    </div>
    <div style="padding:28px;color:#111827;line-height:1.6;">
      <h2 style="margin-top:0;font-size:20px;">${heading}</h2>
      ${body}
    </div>
    <div style="padding:16px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;">
      This is an automated notification from FlowForge. Do not reply to this email.
    </div>
  </div>
</body>
</html>`;
}
