import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateArticleFromTitle, generateArticleWithAI } from '@/lib/blog/anthropic'
import { slugify, fixBrokenLinksInContent } from '@/lib/blog/utils'

// Increase timeout for AI blog generation (can take 30-60 seconds)
// This tells Next.js/Vercel that this route can take longer
export const maxDuration = 60 // 60 seconds

// Verify admin authentication
function verifyAdminAuth(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const apiKey = process.env.ADMIN_API_KEY || 'ekaty-admin-secret-2025'
  
  return authHeader === `Bearer ${apiKey}`
}

// GET - List all articles or get single article
export async function GET(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    
    if (id) {
      const article = await prisma.blogArticle.findUnique({
        where: { id }
      })
      
      if (!article) {
        return NextResponse.json({ error: 'Article not found' }, { status: 404 })
      }
      
      return NextResponse.json(article)
    }
    
    const articles = await prisma.blogArticle.findMany({
      orderBy: { publishedDate: 'desc' }
    })
    
    return NextResponse.json({ articles })
  } catch (error) {
    console.error('Error fetching articles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    )
  }
}

// POST - Create new article or generate with AI
export async function POST(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { action, title, content, metaDescription, keywords, authorName, contactEmail, phoneNumber, status } = body
    
    // Quick generate from title only
    if (action === 'quick_generate' && title) {
      const generated = await generateArticleFromTitle(title)
      const cleanedContent = fixBrokenLinksInContent(generated.content)
      const articleSlug = slugify(generated.title)
      
      const article = await prisma.blogArticle.create({
        data: {
          title: generated.title,
          slug: articleSlug,
          content: cleanedContent,
          metaDescription: generated.metaDescription,
          keywords: generated.keywords,
          authorName: authorName || 'James Strickland',
          contactEmail: contactEmail || 'james@stricklandtechnology.net',
          phoneNumber: phoneNumber || '713-444-6732',
          publishedDate: new Date(),
          status: status || 'published'
        }
      })
      
      return NextResponse.json({
        success: true,
        message: 'Article generated and published successfully!',
        article
      })
    }
    
    // Manual create
    if (title && content) {
      const articleSlug = slugify(title)
      const cleanedContent = fixBrokenLinksInContent(content)
      
      const article = await prisma.blogArticle.create({
        data: {
          title,
          slug: articleSlug,
          content: cleanedContent,
          metaDescription: metaDescription || null,
          keywords: keywords || null,
          authorName: authorName || 'James Strickland',
          contactEmail: contactEmail || null,
          phoneNumber: phoneNumber || null,
          publishedDate: status === 'published' ? new Date() : null,
          status: status || 'draft'
        }
      })
      
      return NextResponse.json({
        success: true,
        message: 'Article created successfully!',
        article
      })
    }
    
    return NextResponse.json(
      { error: 'Title and content are required' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error creating article:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create article' },
      { status: 500 }
    )
  }
}

// PUT - Update article
export async function PUT(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, title, content, metaDescription, keywords, authorName, contactEmail, phoneNumber, status } = body
    
    if (!id || !title || !content) {
      return NextResponse.json(
        { error: 'ID, title and content are required' },
        { status: 400 }
      )
    }
    
    const articleSlug = slugify(title)
    const cleanedContent = fixBrokenLinksInContent(content)
    
    const article = await prisma.blogArticle.update({
      where: { id },
      data: {
        title,
        slug: articleSlug,
        content: cleanedContent,
        metaDescription: metaDescription || null,
        keywords: keywords || null,
        authorName: authorName || undefined,
        contactEmail: contactEmail || null,
        phoneNumber: phoneNumber || null,
        publishedDate: status === 'published' && !body.publishedDate ? new Date() : undefined,
        status: status || undefined
      }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Article updated successfully!',
      article
    })
  } catch (error) {
    console.error('Error updating article:', error)
    return NextResponse.json(
      { error: 'Failed to update article' },
      { status: 500 }
    )
  }
}

// DELETE - Delete article
export async function DELETE(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Article ID is required' },
        { status: 400 }
      )
    }
    
    await prisma.blogArticle.delete({
      where: { id }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Article deleted successfully!'
    })
  } catch (error) {
    console.error('Error deleting article:', error)
    return NextResponse.json(
      { error: 'Failed to delete article' },
      { status: 500 }
    )
  }
}



