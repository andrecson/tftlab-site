import nodemailer from "nodemailer";

/**
 * SMTP email (payment confirmation). Optional: if the SMTP_* env vars are not
 * set, `emailConfigured()` is false and the send helpers no-op, so the payment
 * flow never depends on email being configured.
 *
 * Env: SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASS, SMTP_FROM
 *      (e.g. "TFTLab <no-reply@tftlab.com.br>"), DISCORD_INVITE_URL (optional
 *      server link shown in the email).
 */

export function emailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM,
  );
}

function buildTransport() {
  const port = Number(process.env.SMTP_PORT ?? 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465, // 465 = implicit TLS; 587 = STARTTLS
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

/** Send an email; best-effort (returns false on any failure, never throws). */
async function send(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<boolean> {
  if (!emailConfigured()) return false;
  const to = input.to.trim();
  if (!to) return false;
  try {
    await buildTransport().sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return true;
  } catch (error) {
    console.error("[email] send failed:", error);
    return false;
  }
}

function inviteBlockHtml(): string {
  const invite = process.env.DISCORD_INVITE_URL?.trim();
  if (!invite) return "";
  return `<p style="margin:24px 0"><a href="${invite}" style="display:inline-block;background:#00d9d9;color:#04121a;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:8px">Entrar no Discord</a></p>`;
}

function shell(bodyHtml: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;color:#0f172a;line-height:1.6">
    <h1 style="font-size:20px;margin:0 0 16px">TFTLab</h1>
    ${bodyHtml}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0" />
    <p style="font-size:12px;color:#64748b;margin:0">Qualquer dúvida, é só responder este email.</p>
  </div>`;
}

/** Confirmation sent when a payment is approved and the Discord role is granted. */
export async function sendPaymentConfirmationEmail(input: {
  to: string;
  plan: string;
}): Promise<boolean> {
  const planLabel = input.plan === "year" ? "anual" : "mensal";
  const invite = process.env.DISCORD_INVITE_URL?.trim();
  const inviteText = invite ? `\n\nEntre no servidor: ${invite}` : "";

  const text = `Recebemos seu pagamento do plano ${planLabel} e seu acesso de assinante no TFTLab já está liberado. Você já faz parte do nosso Discord com o cargo de assinante.${inviteText}\n\nValeu por apoiar o TFTLab!`;

  const html = shell(
    `<p>Recebemos seu pagamento do plano <strong>${planLabel}</strong> e seu acesso de assinante no TFTLab já está liberado.</p>
     <p>Você já faz parte do nosso Discord com o <strong>cargo de assinante</strong>.</p>
     ${inviteBlockHtml()}
     <p>Valeu por apoiar o TFTLab!</p>`,
  );

  return send({
    to: input.to,
    subject: "Pagamento confirmado! Seu acesso no TFTLab está ativo",
    text,
    html,
  });
}

/** A test email so a curator can verify the SMTP config from the admin. */
export async function sendTestEmail(to: string): Promise<boolean> {
  return send({
    to,
    subject: "Teste de email do TFTLab",
    text: "Este é um email de teste do TFTLab. Se você recebeu, o SMTP está configurado corretamente.",
    html: shell(
      "<p>Este é um email de teste do TFTLab.</p><p>Se você recebeu, o SMTP está configurado corretamente.</p>",
    ),
  });
}
