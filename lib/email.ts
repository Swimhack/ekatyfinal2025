// A placeholder for a real email sending service
export async function sendEmail({ to, subject, html }: { to: string, subject: string, html: string }) {
  console.log('--- Sending Email ---')
  console.log(`To: ${to}`)
  console.log(`Subject: ${subject}`)
  console.log('Body:')
  console.log(html)
  console.log('---------------------')

  // In a real app, you'd use a service like Resend, SendGrid, or AWS SES
  // For example, using Resend:
  //
  // import { Resend } from 'resend'
  // const resend = new Resend(process.env.RESEND_API_KEY)
  //
  // await resend.emails.send({
  //   from: 'noreply@ekaty.com',
  //   to,
  //   subject,
  //   html
  // })

  return Promise.resolve()
}
