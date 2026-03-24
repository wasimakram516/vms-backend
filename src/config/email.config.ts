import { registerAs } from '@nestjs/config';

export const emailConfig = registerAs('email', () => ({
  host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  user: process.env.SMTP_USER || 'apikey',
  pass: process.env.SMTP_PASS || '',
  from: process.env.SMTP_FROM || 'noreply@sinan.com',
}));
