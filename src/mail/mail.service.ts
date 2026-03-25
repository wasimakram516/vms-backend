import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('email.host'),
      port: this.configService.get<number>('email.port'),
      secure: false, // SendGrid requires STARTTLS, not SSL
      auth: {
        user: this.configService.get<string>('email.user'),
        pass: this.configService.get<string>('email.pass'),
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 1000,
    });
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    attachments?: Array<{ filename: string; content: Buffer; cid: string }>,
  ): Promise<void> {
    const from = this.configService.get<string>('email.from');
    try {
      const info = await this.transporter.sendMail({ from, to, subject, html, attachments });
      const smtpResponse = info?.response || '';
      const smtpCode = parseInt(smtpResponse.split(' ')[0]) || 0;
      const accepted = info?.accepted?.length > 0;
      const success = accepted || (smtpCode >= 200 && smtpCode < 300);
      if (success) {
        this.logger.log(`Email sent to ${to}: ${smtpResponse}`);
      } else {
        this.logger.error(`Failed to send email to ${to}: ${smtpResponse}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error sending email to ${to}: ${msg}`);
    }
  }
}
