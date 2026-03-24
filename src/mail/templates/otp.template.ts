export function buildOtpEmail(code: string): string {
  return `
  <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f6f8fa;padding:20px;">
    <div style="max-width:480px;margin:auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">

      <!-- HEADER -->
      <div style="background:#004aad;padding:24px;text-align:center;">
        <h2 style="color:#fff;font-size:22px;margin:0;">Visitor Verification</h2>
      </div>

      <!-- BODY -->
      <div style="padding:32px;text-align:center;">
        <p style="font-size:15px;color:#333;margin:0 0 20px;">
          Your one-time verification code is:
        </p>
        <div style="display:inline-block;font-size:36px;font-weight:bold;letter-spacing:10px;color:#004aad;background:#f0f5ff;padding:16px 32px;border-radius:8px;margin-bottom:20px;">
          ${code}
        </div>
        <p style="font-size:13px;color:#888;margin:0;">
          This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
        </p>
      </div>

      <!-- FOOTER -->
      <div style="padding:16px 32px;border-top:1px solid #eee;text-align:center;">
        <p style="font-size:12px;color:#aaa;margin:0;">
          If you did not request this code, you can safely ignore this email.
        </p>
      </div>

    </div>
  </div>`;
}
