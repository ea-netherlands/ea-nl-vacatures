/**
 * Slides as one PDF, a page per slide, for LinkedIn: a PDF posted as a
 * document shows as a swipeable carousel, where the same slides posted as
 * images show as a grid you have to click into (James, 13 Nov 2026).
 *
 * JPEGs go into a PDF as they are (DCTDecode), so this needs no library and
 * no re-encoding: read each image's size from its frame header, write one
 * page of exactly that size with the image filling it.
 */

export class PdfError extends Error {}

/** Width and height from a JPEG's start-of-frame marker. */
export function jpegSize(bytes: Uint8Array): { width: number; height: number } {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new PdfError('not a JPEG')
  let i = 2
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) {
      i++
      continue
    }
    const marker = bytes[i + 1]
    // Fill bytes, and markers with no length.
    if (marker === 0xff) {
      i++
      continue
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      i += 2
      continue
    }
    const length = (bytes[i + 2] << 8) | bytes[i + 3]
    // SOF0–SOF15, except DHT (C4), JPG (C8) and DAC (CC).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: (bytes[i + 5] << 8) | bytes[i + 6], width: (bytes[i + 7] << 8) | bytes[i + 8] }
    }
    i += 2 + length
  }
  throw new PdfError('JPEG has no frame header')
}

/** One PDF with a page per JPEG, in order. `title` goes in the document info. */
export function jpegsToPdf(images: Uint8Array[], title = ''): Uint8Array<ArrayBuffer> {
  if (!images.length) throw new PdfError('no slides to put in the PDF')
  const enc = new TextEncoder()
  const chunks: Uint8Array[] = []
  const offsets: number[] = []
  let size = 0
  const push = (part: string | Uint8Array) => {
    const b = typeof part === 'string' ? enc.encode(part) : part
    chunks.push(b)
    size += b.length
  }
  const object = (n: number, ...parts: (string | Uint8Array)[]) => {
    offsets[n] = size
    push(`${n} 0 obj\n`)
    for (const p of parts) push(p)
    push('\nendobj\n')
  }

  // 1 catalog, 2 pages, 3 info; then per slide: page, contents, image.
  const pageIds = images.map((_, i) => 4 + i * 3)
  push('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n')
  object(1, '<< /Type /Catalog /Pages 2 0 R >>')
  object(2, `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${images.length} >>`)
  object(3, `<< /Title ${pdfString(title)} /Producer (effectiefaltruisme.nl) >>`)

  images.forEach((jpeg, i) => {
    const { width, height } = jpegSize(jpeg)
    const [page, contents, image] = [pageIds[i], pageIds[i] + 1, pageIds[i] + 2]
    const draw = `q ${width} 0 0 ${height} 0 0 cm /Im0 Do Q`
    object(
      page,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] ` +
        `/Resources << /XObject << /Im0 ${image} 0 R >> >> /Contents ${contents} 0 R >>`,
    )
    object(contents, `<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`)
    object(
      image,
      `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
      jpeg,
      '\nendstream',
    )
  })

  const count = 4 + images.length * 3
  const xref = size
  push(`xref\n0 ${count}\n0000000000 65535 f \n`)
  for (let n = 1; n < count; n++) push(`${String(offsets[n]).padStart(10, '0')} 00000 n \n`)
  push(`trailer\n<< /Size ${count} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`)

  const out = new Uint8Array(size)
  let at = 0
  for (const c of chunks) {
    out.set(c, at)
    at += c.length
  }
  return out
}

/** A PDF text string: UTF-16BE with a byte-order mark, so ’ and é survive. */
function pdfString(text: string): string {
  let hex = 'FEFF'
  for (let i = 0; i < text.length; i++) hex += text.charCodeAt(i).toString(16).padStart(4, '0').toUpperCase()
  return `<${hex}>`
}
