'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { readJson } from '@/lib/utils/api-response'

// Note: In production, this should be handled server-side or via session auth
// For now, using a client-side approach matching the original PHP implementation
const ADMIN_API_KEY = 'ekaty-admin-secret-2025' // Change this in production!

interface BlogArticle {
  id: string
  title: string
  slug: string
  content: string
  metaDescription?: string | null
  keywords?: string | null
  authorName: string
  contactEmail?: string | null
  phoneNumber?: string | null
  publishedDate?: Date | null
  status: string
  createdAt: Date
  updatedAt: Date
}

export default function BlogManagerPage() {
  const [articles, setArticles] = useState<BlogArticle[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [currentAction, setCurrentAction] = useState<'list' | 'quick_generate' | 'create' | 'edit'>('list')
  const [editingArticle, setEditingArticle] = useState<BlogArticle | null>(null)
  const [quickTitle, setQuickTitle] = useState('')

  useEffect(() => {
    fetchArticles()
  }, [])

  const fetchArticles = async () => {
    try {
      const response = await fetch('/api/admin/blog', {
        headers: {
          'Authorization': `Bearer ${ADMIN_API_KEY}`
        }
      })
      const data = await readJson(response)
      setArticles(data.articles || [])
    } catch (error) {
      console.error('Error fetching articles:', error)
    }
  }

  const handleQuickGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickTitle.trim()) {
      setMessage({ type: 'error', text: 'Title is required' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/blog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ADMIN_API_KEY}`
        },
        body: JSON.stringify({
          action: 'quick_generate',
          title: quickTitle
        })
      })

      const data = await readJson(response)

      if (data.success) {
        setMessage({ type: 'success', text: '✅ Article generated and published successfully!' })
        setQuickTitle('')
        setCurrentAction('list')
        fetchArticles()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to generate article' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to generate article' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return

    try {
      const response = await fetch(`/api/admin/blog?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ADMIN_API_KEY}`
        }
      })

      const data = await readJson(response)

      if (data.success) {
        setMessage({ type: 'success', text: 'Article deleted successfully!' })
        fetchArticles()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete article' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete article' })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">🚀 Blog Manager</h1>
          <p className="text-gray-600 mb-6">Manage your eKaty blog articles</p>
          
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={() => { setCurrentAction('list'); setEditingArticle(null) }}
              className={`px-4 py-2 rounded ${currentAction === 'list' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}
            >
              📋 All Articles
            </button>
            <button
              onClick={() => { setCurrentAction('quick_generate'); setEditingArticle(null) }}
              className={`px-4 py-2 rounded ${currentAction === 'quick_generate' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}
            >
              ⚡ Quick Generate
            </button>
            <button
              onClick={() => { setCurrentAction('create'); setEditingArticle(null) }}
              className={`px-4 py-2 rounded ${currentAction === 'create' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}
            >
              ✍️ Create New
            </button>
            <Link
              href="/blog"
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
              target="_blank"
            >
              🌐 View Blog
            </Link>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded mb-6 ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {currentAction === 'list' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4">📚 All Articles</h2>
            {articles.length === 0 ? (
              <p>No articles found. Create your first article!</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Title</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Published</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {articles.map((article) => (
                      <tr key={article.id} className="border-b">
                        <td className="p-2">
                          <strong>{article.title}</strong>
                        </td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-sm ${
                            article.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {article.status}
                          </span>
                        </td>
                        <td className="p-2">
                          {article.publishedDate ? new Date(article.publishedDate).toLocaleDateString() : 'Not published'}
                        </td>
                        <td className="p-2">
                          <div className="flex gap-2">
                            <Link
                              href={`/blog/${article.slug}`}
                              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                              target="_blank"
                            >
                              View
                            </Link>
                            <button
                              onClick={() => { setEditingArticle(article); setCurrentAction('edit') }}
                              className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(article.id)}
                              className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {currentAction === 'quick_generate' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4">⚡ Quick Generate Article</h2>
            <p className="text-gray-600 mb-6">
              Enter just a title and James Strickland&apos;s AI article agent will generate a complete, research-driven article written from its cute, enthusiastic perspective! 🤖✨
              <strong> Article will be published immediately!</strong>
            </p>

            <form onSubmit={handleQuickGenerate}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Article Title *
                </label>
                <input
                  type="text"
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="e.g., Best BBQ Restaurants in Katy, Texas"
                  required
                />
              </div>

              <div className="bg-yellow-50 p-4 rounded mb-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ Note: Generation takes 30-60 seconds. Article will be published immediately upon completion.
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {loading ? '⏳ Generating...' : '⚡ Generate & Publish'}
                </button>
                <button
                  type="button"
                  onClick={() => { setCurrentAction('list'); setQuickTitle('') }}
                  className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {(currentAction === 'create' || currentAction === 'edit') && (
          <ArticleForm
            article={editingArticle}
            onSuccess={() => {
              setMessage({ type: 'success', text: 'Article saved successfully!' })
              setCurrentAction('list')
              setEditingArticle(null)
              fetchArticles()
            }}
            onCancel={() => {
              setCurrentAction('list')
              setEditingArticle(null)
            }}
          />
        )}
      </div>
    </div>
  )
}

function ArticleForm({ article, onSuccess, onCancel }: {
  article: BlogArticle | null
  onSuccess: () => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    title: article?.title || '',
    content: article?.content || '',
    metaDescription: article?.metaDescription || '',
    keywords: article?.keywords || '',
    authorName: article?.authorName || 'James Strickland',
    contactEmail: article?.contactEmail || '',
    phoneNumber: article?.phoneNumber || '',
    status: article?.status || 'draft'
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = '/api/admin/blog'
      const method = article ? 'PUT' : 'POST'
      const body = article ? { ...formData, id: article.id } : formData

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ADMIN_API_KEY}`
        },
        body: JSON.stringify(body)
      })

      const data = await readJson(response)

      if (data.success) {
        onSuccess()
      } else {
        alert(data.error || 'Failed to save article')
      }
    } catch (error) {
      alert('Failed to save article')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">
        {article ? '✏️ Edit Article' : '✍️ Create New Article'}
      </h2>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Content * (HTML)
          </label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
            rows={15}
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Meta Description
          </label>
          <textarea
            value={formData.metaDescription}
            onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
            rows={2}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Keywords (comma-separated)
          </label>
          <input
            type="text"
            value={formData.keywords}
            onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Author Name
            </label>
            <input
              type="text"
              value={formData.authorName}
              onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : (article ? '💾 Update' : '🚀 Publish')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

