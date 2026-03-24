import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set, skipping email');
    return null;
  }

  return resend.emails.send({
    from: 'JazzNode <digest@jazznode.com>',
    to,
    subject,
    html,
  });
}
