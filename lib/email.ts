import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface EmailParams {
  to: string | string[]
  subject: string
  html: string
  from?: string
}

export async function sendEmail({
  to,
  subject,
  html,
  from = 'onboarding@resend.dev'
}: EmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.log('RESEND_API_KEY not set, skipping email sending.')
    // In a real app, you might want to throw an error or handle this differently
    return
  }

  try {
    const { data, error } = await resend.emails.send({
      from: from,
      to: to,
      subject: subject,
      html: html,
    })

    if (error) {
      console.error('Error sending email:', error)
      // Depending on requirements, you might want to re-throw the error
      // or handle it in a way that the caller can understand.
      throw new Error(`Failed to send email: ${error.message}`)
    }

    console.log('Email sent successfully:', data)
    return data
  } catch (error) {
    console.error('An unexpected error occurred while sending email:', error)
    // Re-throw or handle as per application's error handling strategy
    throw error
  }
}