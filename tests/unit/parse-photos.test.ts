import {
  parsePhotos,
  serializePhotos,
  isPlausiblePhotoUrl,
} from '../../lib/photos/parse-photos'

describe('parsePhotos', () => {
  it('rejoins Wix CDN URLs that contain commas', () => {
    const wix =
      'https://static.wixstatic.com/media/abc123~mv2.jpg/v1/fill/w_286,h_335,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/abc123~mv2.jpg'
    const stored = `${wix},https://example.com/other.jpg`
    const parsed = parsePhotos(stored)
    expect(parsed).toHaveLength(2)
    expect(parsed[0]).toBe(wix)
    expect(parsed[1]).toBe('https://example.com/other.jpg')
  })

  it('rejoins naive array splits of Wix CDN URLs (Seismique case)', () => {
    const full =
      'https://static.wixstatic.com/media/51d719_0818a3093a584c18b91a6d906f5c9283~mv2.png/v1/fill/w_286,h_335,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/Screenshot%202026-04-17%20072349.png'
    const fragments = [
      'https://static.wixstatic.com/media/51d719_0818a3093a584c18b91a6d906f5c9283~mv2.png/v1/fill/w_286',
      'h_335',
      'al_c',
      'q_85',
      'usm_0.66_1.00_0.01',
      'enc_avif',
      'quality_auto/Screenshot%202026-04-17%20072349.png',
    ]
    expect(parsePhotos(fragments)).toEqual([full])
  })

  it('reads JSON array encoding', () => {
    const urls = [
      'https://static.wixstatic.com/media/x.jpg/v1/fill/w_100,h_200/x.jpg',
      'https://ekaty.com/uploads/a.jpg',
    ]
    expect(parsePhotos(JSON.stringify(urls))).toEqual(urls)
  })

  it('serializes comma-heavy URLs as JSON', () => {
    const urls = [
      'https://static.wixstatic.com/media/x.jpg/v1/fill/w_100,h_200/x.jpg',
    ]
    const serialized = serializePhotos(urls)
    expect(serialized.startsWith('[')).toBe(true)
    expect(parsePhotos(serialized)).toEqual(urls)
  })

  it('rejects orphan CDN transform fragments', () => {
    expect(isPlausiblePhotoUrl('h_335')).toBe(false)
    expect(isPlausiblePhotoUrl('https://cdn.example.com/photo.jpg')).toBe(true)
  })
})
