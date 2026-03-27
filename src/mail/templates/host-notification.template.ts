import { buildBaseEmail } from './base.template.js';

interface HostBase {
  name: string;
  logoUrl?: string | null;
}

interface VisitorSummary {
  fullName: string;
  organisation?: string;
  idNumber?: string;
  email?: string;
  phone?: string;
  purpose?: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function row(label: string, value: string | undefined | null): string {
  if (!value) return '';
  return `
    <tr>
      <td style="padding:8px 12px;font-size:13px;color:#6c757d;white-space:nowrap;width:140px;vertical-align:top;">${label}</td>
      <td style="padding:8px 12px;font-size:13px;color:#212529;font-weight:500;">${value}</td>
    </tr>`;
}

function infoTable(rows: string): string {
  return `
  <table style="width:100%;border-collapse:collapse;background:#f8f9fa;border-radius:8px;overflow:hidden;margin-top:16px;">
    <tbody>${rows}</tbody>
  </table>`;
}

function statusBadge(label: string, color: string): string {
  return `<span style="display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;letter-spacing:0.5px;background:${color};color:#fff;">${label}</span>`;
}

function greeting(visitorName: string, extra = ''): string {
  return `
  <p style="font-size:15px;color:#343a40;margin:0 0 4px;">
    <strong>${visitorName}</strong>${extra}
  </p>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid #e9ecef;margin:20px 0;" />`;
}

// ── Visitor detail block ───────────────────────────────────────────────────────

function visitorBlock(v: VisitorSummary, extra?: { label: string; value: string | null | undefined }[]): string {
  const rows = [
    row('Full Name', v.fullName),
    row('Organisation', v.organisation),
    row('ID / Passport', v.idNumber),
    row('Email', v.email),
    row('Phone', v.phone),
    row('Purpose', v.purpose),
    ...(extra ?? []).map((e) => row(e.label, e.value)),
  ].join('');
  return infoTable(rows);
}

// ── New registration submitted ────────────────────────────────────────────────

export function buildHostNewRegistrationEmail(params: {
  host: HostBase;
  visitor: VisitorSummary;
  requestedDate: string;
  requestedTime?: string | null;
}): string {
  const { host, visitor, requestedDate, requestedTime } = params;

  const content = `
    <p style="font-size:14px;color:#6c757d;margin:0 0 16px;">
      A new visit request has been submitted and is awaiting your review.
    </p>
    ${greeting(visitor.fullName, ' has requested a visit.')}
    ${visitorBlock(visitor, [
      { label: 'Requested Date', value: requestedDate },
      { label: 'Requested Time', value: requestedTime },
    ])}
    ${divider()}
    <p style="font-size:13px;color:#6c757d;margin:0;">
      Please log in to the VMS portal to approve or reject this request.
    </p>`;

  return buildBaseEmail({
    hostName: host.name,
    hostLogoUrl: host.logoUrl,
    title: 'New Visit Request',
    content,
  });
}

// ── Registration approved (host copy) ─────────────────────────────────────────

export function buildHostApprovedEmail(params: {
  host: HostBase;
  visitor: VisitorSummary;
  approvedDate: string;
  approvedTime?: string | null;
}): string {
  const { host, visitor, approvedDate, approvedTime } = params;

  const content = `
    <p style="font-size:14px;color:#6c757d;margin:0 0 16px;">
      You have <strong>approved</strong> the following visit request.
    </p>
    ${statusBadge('APPROVED', '#198754')}
    ${visitorBlock(visitor, [
      { label: 'Approved Date', value: approvedDate },
      { label: 'Approved Time', value: approvedTime },
    ])}`;

  return buildBaseEmail({
    hostName: host.name,
    hostLogoUrl: host.logoUrl,
    title: 'Visit Approved',
    content,
  });
}

// ── Registration rejected (host copy) ─────────────────────────────────────────

export function buildHostRejectedEmail(params: {
  host: HostBase;
  visitor: VisitorSummary;
  rejectionReason?: string | null;
}): string {
  const { host, visitor, rejectionReason } = params;

  const reasonRow = rejectionReason ? row('Reason', rejectionReason) : '';

  const content = `
    <p style="font-size:14px;color:#6c757d;margin:0 0 16px;">
      You have <strong>rejected</strong> the following visit request.
    </p>
    ${statusBadge('REJECTED', '#dc3545')}
    ${visitorBlock(visitor)}
    ${reasonRow ? infoTable(reasonRow) : ''}`;

  return buildBaseEmail({
    hostName: host.name,
    hostLogoUrl: host.logoUrl,
    title: 'Visit Rejected',
    content,
  });
}

// ── Registration cancelled (host copy) ────────────────────────────────────────

export function buildHostCancelledEmail(params: {
  host: HostBase;
  visitor: VisitorSummary;
  approvedDate?: string | null;
}): string {
  const { host, visitor, approvedDate } = params;

  const content = `
    <p style="font-size:14px;color:#6c757d;margin:0 0 16px;">
      The following visit has been <strong>cancelled</strong>.
    </p>
    ${statusBadge('CANCELLED', '#6c757d')}
    ${visitorBlock(visitor, [{ label: 'Scheduled Date', value: approvedDate }])}`;

  return buildBaseEmail({
    hostName: host.name,
    hostLogoUrl: host.logoUrl,
    title: 'Visit Cancelled',
    content,
  });
}

// ── Visitor checked in (NDA email) ────────────────────────────────────────────

export function buildHostCheckInEmail(params: {
  host: HostBase;
  visitor: VisitorSummary;
  checkInTime: string;
  approvedDate: string;
  approvedTime?: string | null;
  ndaFilename: string;
}): string {
  const { host, visitor, checkInTime, approvedDate, approvedTime, ndaFilename } = params;

  const content = `
    <p style="font-size:14px;color:#6c757d;margin:0 0 16px;">
      A visitor has successfully checked in. The signed NDA is attached to this email.
    </p>
    ${statusBadge('CHECKED IN', '#0d6efd')}
    ${visitorBlock(visitor, [
      { label: 'Approved Date', value: approvedDate },
      { label: 'Approved Time', value: approvedTime },
      { label: 'Checked In At', value: checkInTime },
    ])}
    ${divider()}
    <p style="font-size:13px;color:#6c757d;margin:0;">
      The signed NDA document (<strong>${ndaFilename}</strong>) is attached to this email for your records.
    </p>`;

  return buildBaseEmail({
    hostName: host.name,
    hostLogoUrl: host.logoUrl,
    title: 'Visitor Check-In — NDA Signed',
    content,
  });
}

// ── Visitor checked out ───────────────────────────────────────────────────────

export function buildHostCheckOutEmail(params: {
  host: HostBase;
  visitor: VisitorSummary;
  checkInTime?: string | null;
  checkOutTime: string;
  duration?: string | null;
}): string {
  const { host, visitor, checkInTime, checkOutTime, duration } = params;

  const content = `
    <p style="font-size:14px;color:#6c757d;margin:0 0 16px;">
      The following visitor has completed their visit and checked out.
    </p>
    ${statusBadge('CHECKED OUT', '#6610f2')}
    ${visitorBlock(visitor, [
      { label: 'Checked In At', value: checkInTime },
      { label: 'Checked Out At', value: checkOutTime },
      { label: 'Duration', value: duration },
    ])}`;

  return buildBaseEmail({
    hostName: host.name,
    hostLogoUrl: host.logoUrl,
    title: 'Visitor Checked Out',
    content,
  });
}
