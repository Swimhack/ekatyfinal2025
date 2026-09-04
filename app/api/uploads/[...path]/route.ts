import { NextRequest, NextResponse } from 'next/server'
import { readLocalUpload, UploadStorageError } from '@/lib/upload-storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Serves locally stored uploads that Next's static handler missed.
 *
 * `/uploads/:path*` is rewritten here only after the filesystem check fails,
 * which covers standalone builds where the file landed in one public tree but
 * the server reads from another.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const key = (params.path || []).join('/')

  try {
    const upload = await readLocalUpload(key)

    if (!upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 })
    }

    return new NextResponse(new Uint8Array(upload.buffer), {
      status: 200,
      headers: {
        'Content-Type': upload.contentType,
        'Content-Length': String(upload.buffer.byteLength),
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    if (error instanceof UploadStorageError) {
      return NextResponse.json({ error: 'Invalid upload path' }, { status: 400 })
    }

    console.error('Failed to serve upload', key, error)
    return NextResponse.json({ error: 'Failed to read upload' }, { status: 500 })
  }
}
