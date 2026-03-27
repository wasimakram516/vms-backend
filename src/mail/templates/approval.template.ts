import { buildBaseEmail } from './base.template.js';

export type RegistrationEmailStatus = 'approved' | 'rejected' | 'cancelled';

const STATUS_CONFIG: Record<RegistrationEmailStatus, { title: string; message: string }> = {
  approved: {
    title: 'Visit Approved',
    message: 'Great news! Your visit request has been <strong>approved</strong>. Please present the QR code below at the entrance when you arrive.',
  },
  rejected: {
    title: 'Visit Request Rejected',
    message: 'Unfortunately, your visit request has been <strong>rejected</strong>.',
  },
  cancelled: {
    title: 'Visit Cancelled',
    message: 'Your visit registration has been <strong>cancelled</strong>.',
  },
};

export function buildRegistrationStatusEmail(params: {
  status: RegistrationEmailStatus;
  visitorName: string;
  hostName?: string;
  hostLogoUrl?: string | null;
  // approved only
  approvedDateFrom?: string;
  approvedDateTo?: string;
  approvedTimeFrom?: string;
  approvedTimeTo?: string;
  purposeOfVisit?: string | null;
  qrToken?: string;
  // rejected only
  rejectionReason?: string | null;
}): string {
  const {
    status,
    visitorName,
    hostName = 'Visitor Management',
    hostLogoUrl,
    approvedDateFrom,
    approvedDateTo,
    approvedTimeFrom,
    approvedTimeTo,
    purposeOfVisit,
    qrToken,
    rejectionReason,
  } = params;

  const config = STATUS_CONFIG[status];

  const dateRange =
    approvedDateFrom && approvedDateTo
      ? approvedDateFrom === approvedDateTo
        ? approvedDateFrom
        : `${approvedDateFrom} – ${approvedDateTo}`
      : null;

  const timeRange =
    approvedTimeFrom && approvedTimeTo
      ? `${approvedTimeFrom} – ${approvedTimeTo}`
      : null;

  const qrSection =
    status === 'approved' && qrToken
      ? `
        <p style="font-size:14px;color:#495057;margin-top:20px;">
          Please present this QR code at the reception desk on arrival:
        </p>
        <div style="text-align:center;margin:16px 0;">
          <img src="cid:qrcode@sinan" alt="Entry QR Code"
            style="width:180px;height:180px;border:1px solid #dee2e6;border-radius:8px;padding:8px;display:inline-block;" />
        </div>
        <p style="font-size:13px;color:#6c757d;text-align:center;margin:0;">
          Token: <strong style="color:#121922;">${qrToken}</strong>
        </p>`
      : '';

  const detailsSection =
    status === 'approved' && dateRange
      ? `
        <table style="width:100%;border-collapse:collapse;background:#f8f9fa;border-radius:8px;overflow:hidden;margin-top:20px;">
          <tbody>
            <tr>
              <td style="padding:8px 12px;font-size:13px;color:#6c757d;width:120px;">Date</td>
              <td style="padding:8px 12px;font-size:13px;color:#212529;font-weight:500;">${dateRange}</td>
            </tr>
            ${timeRange ? `<tr>
              <td style="padding:8px 12px;font-size:13px;color:#6c757d;">Time</td>
              <td style="padding:8px 12px;font-size:13px;color:#212529;font-weight:500;">${timeRange}</td>
            </tr>` : ''}
            ${purposeOfVisit ? `<tr>
              <td style="padding:8px 12px;font-size:13px;color:#6c757d;">Purpose</td>
              <td style="padding:8px 12px;font-size:13px;color:#212529;font-weight:500;">${purposeOfVisit}</td>
            </tr>` : ''}
          </tbody>
        </table>`
      : '';

  const rejectionSection =
    status === 'rejected' && rejectionReason
      ? `
        <p style="font-size:13px;color:#6c757d;margin-top:16px;">
          <strong>Reason:</strong> ${rejectionReason}
        </p>`
      : '';

  const content = `
    <p style="font-size:15px;color:#343a40;margin:0 0 8px;">
      Hi <strong>${visitorName}</strong>,
    </p>
    <p style="font-size:14px;color:#495057;line-height:1.6;margin:0;">
      ${config.message}
    </p>
    ${detailsSection}
    ${qrSection}
    ${rejectionSection}
    <hr style="border:none;border-top:1px solid #e9ecef;margin:20px 0;" />
    <p style="font-size:13px;color:#6c757d;margin:0;">
      If you have any questions, please contact the reception desk directly.
    </p>`;

  return buildBaseEmail({
    hostName,
    hostLogoUrl,
    title: config.title,
    content,
    footerNote: `You are receiving this email because you submitted a visit request to <strong>${hostName}</strong>.`,
  });
}
