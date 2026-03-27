import { buildBaseEmail } from './base.template.js';

export function buildOtpEmail(code: string, hostName = 'Visitor Management', hostLogoUrl?: string | null): string {
  const content = `
    <p style="font-size:14px;color:#495057;text-align:center;margin:0 0 20px;">
      Use the code below to verify your identity and access the visitor portal.
    </p>
    <div style="text-align:center;margin:0 0 20px;">
      <div style="display:inline-block;font-size:38px;font-weight:700;letter-spacing:12px;color:#121922;background:#f0f2f5;padding:16px 32px;border-radius:10px;">
        ${code}
      </div>
    </div>
    <p style="font-size:13px;color:#6c757d;text-align:center;margin:0;">
      This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
    </p>`;

  return buildBaseEmail({
    hostName,
    hostLogoUrl,
    title: 'Visitor Verification Code',
    content,
    footerNote: 'If you did not request this code, you can safely ignore this email.',
  });
}
