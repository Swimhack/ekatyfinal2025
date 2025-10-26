import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      name,
      email,
      phone,
      restaurantName,
      subject,
      message,
      type = 'general'
    } = body

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Save to database
    const submission = await prisma.contactSubmission.create({
      data: {
        name,
        email,
        phone,
        subject,
        message,
        type,
        metadata: restaurantName ? JSON.stringify({ restaurantName }) : null,
        responded: false
      }
    })

    // Send email notification to admin
    await sendEmail({
      to: 'james@ekaty.com',
      subject: `New Contact Form Submission: ${subject}`,
      html: `
        <h1>New Contact Submission</h1>
        <p><strong>Type:</strong> ${type}</p>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
        ${restaurantName ? `<p><strong>Restaurant:</strong> ${restaurantName}</p>` : ''}
        <hr>
        <h2>Message:</h2>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `
    })

    // Send confirmation email to user (in production)
    // await sendEmail({
    //   to: email,
    //   subject: 'We received your message',
    //   template: 'contact-confirmation',
    //   data: { name, subject }
    // })

    return NextResponse.json({
      success: true,
      message: 'Your message has been sent successfully',
      id: submission.id
    })
    
  } catch (error) {
    console.error('Error processing contact form:', error)
    return NextResponse.json(
      { error: 'Failed to process contact form' },
      { status: 500 }
    )
  }
}