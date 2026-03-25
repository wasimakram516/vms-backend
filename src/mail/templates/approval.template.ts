export type RegistrationEmailStatus = 'approved' | 'rejected' | 'cancelled';

const STATUS_CONFIG: Record<RegistrationEmailStatus, { label: string; message: string }> = {
  approved: {
    label: 'Visit Approved',
    message: 'Your visit request has been <strong>approved</strong>! Please present the QR code below at the entrance for check-in.',
  },
  rejected: {
    label: 'Visit Request Rejected',
    message: 'Unfortunately, your visit request has been <strong>rejected</strong>.',
  },
  cancelled: {
    label: 'Visit Cancelled',
    message: 'Your visit registration has been <strong>cancelled</strong>.',
  },
};

export function buildRegistrationStatusEmail(params: {
  status: RegistrationEmailStatus;
  visitorName: string;
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
        <p style="font-size:15px;color:#333;line-height:1.6;margin-top:24px;">
          Please present this QR at check-in:
        </p>
        <div style="text-align:center;margin:20px 0;">
          <a href="#" style="cursor:default;display:inline-block;text-decoration:none;" tabindex="-1">
            <img src="cid:qrcode@sinan" alt="Entry QR Code"
              style="width:200px;height:200px;border:1px solid #eee;border-radius:8px;padding:8px;pointer-events:none;display:block;" />
          </a>
        </div>
        <p style="font-size:15px;color:#333;line-height:1.6;text-align:center;">
          Your Token: <strong>${qrToken}</strong>
        </p>`
      : '';

  const detailsSection =
    status === 'approved' && dateRange
      ? `
        <h3 style="margin-top:24px;font-size:17px;color:#004aad;">Visit Details:</h3>
        <table style="width:100%;font-size:14px;color:#333;">
          <tr>
            <td style="padding:4px 0;"><strong>Date:</strong></td>
            <td style="padding:4px 0;">${dateRange}</td>
          </tr>
          ${timeRange ? `<tr>
            <td style="padding:4px 0;"><strong>Time:</strong></td>
            <td style="padding:4px 0;">${timeRange}</td>
          </tr>` : ''}
          ${purposeOfVisit ? `<tr>
            <td style="padding:4px 0;"><strong>Purpose:</strong></td>
            <td style="padding:4px 0;">${purposeOfVisit}</td>
          </tr>` : ''}
        </table>`
      : '';

  const rejectionSection =
    status === 'rejected' && rejectionReason
      ? `
        <p style="font-size:14px;color:#555;margin-top:16px;">
          <strong>Reason:</strong> ${rejectionReason}
        </p>`
      : '';

  return `
  <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f6f8fa;padding:20px;">
    <div style="max-width:640px;margin:auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">

      <!-- HEADER -->
      <div style="background:#004aad;padding:24px;text-align:center;">
        <h2 style="color:#fff;font-size:22px;margin:0;">${config.label}</h2>
      </div>

      <!-- CONTENT BODY -->
      <div style="padding:24px 28px 28px;">

        <p style="font-size:15px;color:#333;margin-top:28px;">
          Hi <strong>${visitorName}</strong>,
        </p>

        <p style="font-size:15px;color:#333;line-height:1.6;">
          ${config.message}
        </p>

        ${qrSection}
        ${detailsSection}
        ${rejectionSection}

        <!-- FOOTER -->
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        <p style="font-size:14px;color:#777;">
          If you have any questions, please contact the reception.
        </p>
        <p style="font-size:14px;color:#777;">
          See you soon!
        </p>

      </div>
    </div>
  </div>`;
}
