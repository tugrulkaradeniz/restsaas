import { Resend } from 'resend'

export async function sendOtpEmail(email: string, code: string, restaurantName: string) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? 'noreply@restsaas.com',
    to: email,
    subject: `${restaurantName} — Doğrulama Kodunuz: ${code}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="color:#f97316;margin:0 0 8px">${restaurantName}</h2>
        <p style="color:#6b7280;font-size:14px;margin:0 0 24px">Online Sipariş Doğrulama</p>
        <div style="background:#fff7ed;border:2px solid #fed7aa;border-radius:16px;padding:24px;text-align:center;margin-bottom:24px">
          <p style="color:#9a3412;font-size:13px;margin:0 0 8px;font-weight:600">DOĞRULAMA KODUNUZ</p>
          <p style="font-size:42px;font-weight:800;color:#ea580c;letter-spacing:12px;margin:0;font-family:monospace">${code}</p>
          <p style="color:#9a3412;font-size:12px;margin:8px 0 0">10 dakika geçerli</p>
        </div>
        <p style="color:#6b7280;font-size:12px;text-align:center">
          Bu kodu kimseyle paylaşmayın. Eğer sipariş vermediyseniz bu emaili görmezden gelin.
        </p>
      </div>
    `,
  })
  if (error) throw new Error(error.message)
}
