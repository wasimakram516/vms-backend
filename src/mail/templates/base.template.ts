export interface BaseEmailOptions {
  hostName: string;
  hostLogoUrl?: string | null;
  title: string;
  content: string;
  footerNote?: string;
}

/**
 * Shared wrapper used by all outgoing emails.
 * Dark header with host logo + name, white body, subtle grey footer.
 */
export function buildBaseEmail(opts: BaseEmailOptions): string {
  const { hostName, hostLogoUrl, title, content, footerNote } = opts;

  const logoHtml = hostLogoUrl
    ? `<img src="${hostLogoUrl}" alt="${hostName}" style="height:44px;max-width:160px;object-fit:contain;display:block;margin:0 auto 10px;" />`
    : '';

  const footer =
    footerNote ??
    `This is an automated message from <strong>${hostName}</strong>.`;

  return `
  <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f0f2f5;padding:24px;">
    <div style="max-width:640px;margin:auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">

      <!-- HEADER -->
      <div style="background:#121922;padding:28px 24px;text-align:center;">
        ${logoHtml}
        <p style="color:#94a3b8;font-size:11px;margin:0 0 6px;letter-spacing:1.5px;text-transform:uppercase;">${hostName}</p>
        <h2 style="color:#ffffff;font-size:20px;margin:0;font-weight:600;letter-spacing:0.3px;">${title}</h2>
      </div>

      <!-- BODY -->
      <div style="padding:28px 32px 32px;">
        ${content}
      </div>

      <!-- FOOTER -->
      <div style="background:#f8f9fa;padding:14px 32px;border-top:1px solid #e9ecef;text-align:center;">
        <p style="font-size:12px;color:#adb5bd;margin:0;line-height:1.5;">${footer}</p>
      </div>

    </div>
  </div>`;
}
