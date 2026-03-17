const EXPORT_SVG_WIDTH = 1600
const EXPORT_SVG_HEIGHT = 1000
const EXPORT_COLORS = [
    '#12725a',
    '#2787c7',
    '#c05c2b',
    '#7a43b6',
    '#cf3b63',
    '#0f766e',
    '#a16207',
    '#2563eb',
]

function padNumber(value) {
    return String(value).padStart(2, '0')
}

function toFilenameSafeText(value) {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replaceAll('æ', 'ae')
        .replaceAll('ø', 'o')
        .replaceAll('å', 'a')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

function getTimestampSuffix(date = new Date()) {
    return [
        date.getFullYear(),
        padNumber(date.getMonth() + 1),
        padNumber(date.getDate()),
    ].join('-') + '_' + [
        padNumber(date.getHours()),
        padNumber(date.getMinutes()),
        padNumber(date.getSeconds()),
    ].join('-')
}

function resolveFilename({ filename, filenamePrefix = 'kartlag-eksport', extension }) {
    if (filename) return filename

    const prefix = sanitizeFilenameSegment(filenamePrefix, 'kartlag-eksport')
    return `${prefix}-${getTimestampSuffix()}.${extension}`
}

function normalizeFeature(geoJson) {
    if (!geoJson?.type) return null

    if (geoJson.type === 'Feature') return geoJson

    if (geoJson.type === 'FeatureCollection') {
        return geoJson.features
            .map(feature => normalizeFeature(feature))
            .filter(Boolean)
    }

    return {
        type: 'Feature',
        properties: {},
        geometry: geoJson,
    }
}

function decorateFeature(feature, layer, featureIndex = 0) {
    if (!feature?.geometry) return null

    return {
        ...feature,
        id: feature.id ?? `${layer.id}-${featureIndex + 1}`,
        properties: {
            ...(feature.properties ?? {}),
            exportLayerId: layer.id,
            exportLayerName: layer.name,
            exportLayerShape: layer.shape,
            exportLayerVisible: layer.visible ?? true,
        },
    }
}

function getLayerFeatures(layer) {
    const normalized = normalizeFeature(layer?.geoJson)

    if (!normalized) return []

    if (Array.isArray(normalized)) {
        return normalized
            .map((feature, index) => decorateFeature(feature, layer, index))
            .filter(Boolean)
    }

    return [decorateFeature(normalized, layer)].filter(Boolean)
}

function getExportableLayers(layers = []) {
    return layers.filter(layer => layer?.geoJson)
}

function createFeatureCollection(layers = []) {
    return {
        type: 'FeatureCollection',
        features: getExportableLayers(layers).flatMap(getLayerFeatures),
    }
}

function createJsonExport(layers = []) {
    const exportableLayers = getExportableLayers(layers)

    return {
        exportedAt: new Date().toISOString(),
        layerCount: exportableLayers.length,
        featureCount: exportableLayers.flatMap(getLayerFeatures).length,
        layers: exportableLayers.map(layer => ({
            id: layer.id,
            name: layer.name,
            shape: layer.shape,
            visible: layer.visible ?? true,
            featureCount: getLayerFeatures(layer).length,
            geoJson: layer.geoJson,
        })),
    }
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
}

function downloadJsonFile(data, options) {
    const filename = resolveFilename(options)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: options.mimeType })
    downloadBlob(blob, filename)
}

function escapeXml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;')
}

function formatSvgNumber(value) {
    return Number(value).toFixed(2)
}

function formatExportDate(date = new Date()) {
    return new Intl.DateTimeFormat('nb-NO', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date)
}

function forEachCoordinate(geometry, callback) {
    if (!geometry?.type) return

    switch (geometry.type) {
        case 'Point':
            callback(geometry.coordinates)
            break
        case 'MultiPoint':
        case 'LineString':
            geometry.coordinates.forEach(callback)
            break
        case 'MultiLineString':
        case 'Polygon':
            geometry.coordinates.forEach(line => line.forEach(callback))
            break
        case 'MultiPolygon':
            geometry.coordinates.forEach(polygon =>
                polygon.forEach(ring => ring.forEach(callback))
            )
            break
        case 'GeometryCollection':
            geometry.geometries.forEach(child => forEachCoordinate(child, callback))
            break
        default:
            break
    }
}

function getGeometryBounds(features) {
    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY

    features.forEach(feature => {
        forEachCoordinate(feature.geometry, coordinate => {
            const [x, y] = coordinate
            minX = Math.min(minX, x)
            minY = Math.min(minY, y)
            maxX = Math.max(maxX, x)
            maxY = Math.max(maxY, y)
        })
    })

    if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
        return {
            minX: -1,
            minY: -1,
            maxX: 1,
            maxY: 1,
        }
    }

    if (Math.abs(maxX - minX) < 1e-9) {
        minX -= 0.01
        maxX += 0.01
    }

    if (Math.abs(maxY - minY) < 1e-9) {
        minY -= 0.01
        maxY += 0.01
    }

    return { minX, minY, maxX, maxY }
}

function createProjector(bounds, frame) {
    const spanX = bounds.maxX - bounds.minX
    const spanY = bounds.maxY - bounds.minY
    const scale = Math.min(frame.width / spanX, frame.height / spanY)
    const offsetX = frame.x + (frame.width - spanX * scale) / 2
    const offsetY = frame.y + (frame.height - spanY * scale) / 2

    return {
        scale,
        project([x, y]) {
            return {
                x: offsetX + (x - bounds.minX) * scale,
                y: offsetY + frame.height - (y - bounds.minY) * scale,
            }
        },
    }
}

function coordinatesToPath(coordinates, project) {
    if (!coordinates?.length) return ''

    return coordinates
        .map((coordinate, index) => {
            const point = project(coordinate)
            const command = index === 0 ? 'M' : 'L'
            return `${command} ${formatSvgNumber(point.x)} ${formatSvgNumber(point.y)}`
        })
        .join(' ')
}

function polygonToPath(rings, project) {
    return rings
        .filter(ring => ring.length)
        .map(ring => `${coordinatesToPath(ring, project)} Z`)
        .join(' ')
}

function geometryToSvg(geometry, color, projector) {
    if (!geometry?.type) return ''

    const pointRadius = 7

    switch (geometry.type) {
        case 'Point': {
            const point = projector.project(geometry.coordinates)
            return `
                <circle cx="${formatSvgNumber(point.x)}" cy="${formatSvgNumber(point.y)}" r="${pointRadius + 4}" fill="${color}" fill-opacity="0.18" />
                <circle cx="${formatSvgNumber(point.x)}" cy="${formatSvgNumber(point.y)}" r="${pointRadius}" fill="${color}" />
            `
        }
        case 'MultiPoint':
            return geometry.coordinates
                .map(pointCoordinates => geometryToSvg({ type: 'Point', coordinates: pointCoordinates }, color, projector))
                .join('')
        case 'LineString':
            return `<path d="${coordinatesToPath(geometry.coordinates, projector.project)}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />`
        case 'MultiLineString':
            return geometry.coordinates
                .map(line => geometryToSvg({ type: 'LineString', coordinates: line }, color, projector))
                .join('')
        case 'Polygon':
            return `<path d="${polygonToPath(geometry.coordinates, projector.project)}" fill="${color}" fill-opacity="0.18" stroke="${color}" stroke-width="4" stroke-linejoin="round" fill-rule="evenodd" />`
        case 'MultiPolygon':
            return geometry.coordinates
                .map(polygon => geometryToSvg({ type: 'Polygon', coordinates: polygon }, color, projector))
                .join('')
        case 'GeometryCollection':
            return geometry.geometries
                .map(child => geometryToSvg(child, color, projector))
                .join('')
        default:
            return ''
    }
}

function createLegendMarkup(layers, colorByLayer) {
    const maxVisibleItems = 9
    const visibleLayers = layers.slice(0, maxVisibleItems)
    const hiddenCount = Math.max(layers.length - visibleLayers.length, 0)

    const items = visibleLayers.map((layer, index) => {
        const y = 260 + index * 68
        const color = colorByLayer.get(layer.id)
        const featureCount = getLayerFeatures(layer).length
        const meta = [
            layer.shape || 'Lag',
            layer.visible ? 'Synlig' : 'Skjult',
            `${featureCount} ${featureCount === 1 ? 'objekt' : 'objekter'}`,
        ].join(' • ')

        return `
            <g transform="translate(1112 ${y})">
                <rect x="0" y="0" width="14" height="14" rx="4" fill="${color}" />
                <text x="26" y="12" font-family="Segoe UI, Arial, sans-serif" font-size="22" font-weight="700" fill="#17352d">${escapeXml(layer.name)}</text>
                <text x="26" y="38" font-family="Segoe UI, Arial, sans-serif" font-size="16" fill="#49645d">${escapeXml(meta)}</text>
            </g>
        `
    }).join('')

    const remainder = hiddenCount > 0
        ? `<text x="1112" y="${260 + visibleLayers.length * 68}" font-family="Segoe UI, Arial, sans-serif" font-size="16" fill="#49645d">+ ${hiddenCount} flere valgte lag</text>`
        : ''

    return `${items}${remainder}`
}

function createGridMarkup(frame) {
    const verticalLines = Array.from({ length: 6 }, (_, index) => {
        const x = frame.x + (frame.width / 5) * index
        return `<line x1="${formatSvgNumber(x)}" y1="${frame.y}" x2="${formatSvgNumber(x)}" y2="${frame.y + frame.height}" stroke="#d8e6df" stroke-width="1" />`
    }).join('')

    const horizontalLines = Array.from({ length: 5 }, (_, index) => {
        const y = frame.y + (frame.height / 4) * index
        return `<line x1="${frame.x}" y1="${formatSvgNumber(y)}" x2="${frame.x + frame.width}" y2="${formatSvgNumber(y)}" stroke="#d8e6df" stroke-width="1" />`
    }).join('')

    return `${verticalLines}${horizontalLines}`
}

function createExportSvg(layers) {
    const exportableLayers = getExportableLayers(layers)
    const featureCollection = createFeatureCollection(exportableLayers)
    const features = featureCollection.features

    if (!features.length) {
        throw new Error('Ingen kartlag med geometri er valgt for eksport.')
    }

    const plotFrame = {
        x: 86,
        y: 214,
        width: 930,
        height: 660,
    }
    const bounds = getGeometryBounds(features)
    const projector = createProjector(bounds, plotFrame)
    const colorByLayer = new Map(
        exportableLayers.map((layer, index) => [
            layer.id,
            EXPORT_COLORS[index % EXPORT_COLORS.length],
        ])
    )
    const geometryMarkup = features.map(feature => {
        const color = colorByLayer.get(feature.properties?.exportLayerId) || EXPORT_COLORS[0]
        return geometryToSvg(feature.geometry, color, projector)
    }).join('')

    return `
        <svg xmlns="http://www.w3.org/2000/svg" width="${EXPORT_SVG_WIDTH}" height="${EXPORT_SVG_HEIGHT}" viewBox="0 0 ${EXPORT_SVG_WIDTH} ${EXPORT_SVG_HEIGHT}">
            <defs>
                <linearGradient id="export-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#eff6f2" />
                    <stop offset="100%" stop-color="#dfece5" />
                </linearGradient>
            </defs>

            <rect width="${EXPORT_SVG_WIDTH}" height="${EXPORT_SVG_HEIGHT}" fill="url(#export-bg)" />
            <circle cx="1430" cy="110" r="180" fill="#bddbcc" fill-opacity="0.42" />
            <circle cx="118" cy="922" r="210" fill="#c7e6d4" fill-opacity="0.45" />

            <text x="86" y="98" font-family="Segoe UI, Arial, sans-serif" font-size="54" font-weight="700" fill="#17352d">Eksporterte kartlag</text>
            <text x="86" y="136" font-family="Segoe UI, Arial, sans-serif" font-size="24" fill="#49645d">Generert ${escapeXml(formatExportDate())}</text>
            <text x="86" y="172" font-family="Segoe UI, Arial, sans-serif" font-size="22" fill="#49645d">${exportableLayers.length} valgte lag • ${features.length} ${features.length === 1 ? 'geometri' : 'geometrier'}</text>

            <rect x="62" y="194" width="978" height="704" rx="28" fill="#ffffff" stroke="#cdded5" />
            <rect x="1082" y="194" width="456" height="704" rx="28" fill="#ffffff" stroke="#cdded5" />

            <text x="96" y="246" font-family="Segoe UI, Arial, sans-serif" font-size="26" font-weight="700" fill="#17352d">Kartskisse</text>
            <text x="1112" y="246" font-family="Segoe UI, Arial, sans-serif" font-size="26" font-weight="700" fill="#17352d">Valgte lag</text>

            ${createGridMarkup(plotFrame)}
            <rect x="${plotFrame.x}" y="${plotFrame.y}" width="${plotFrame.width}" height="${plotFrame.height}" rx="22" fill="none" stroke="#d5e3dc" stroke-width="2" />

            <g>
                ${geometryMarkup}
            </g>

            ${createLegendMarkup(exportableLayers, colorByLayer)}

            <text x="86" y="944" font-family="Segoe UI, Arial, sans-serif" font-size="18" fill="#49645d">PNG og PDF er grafiske eksportfiler basert på valgte lag.</text>
            <text x="86" y="972" font-family="Segoe UI, Arial, sans-serif" font-size="18" fill="#49645d">GeoJSON og JSON inneholder de samme geodataene som eksporteres fra sidepanelet.</text>
        </svg>
    `
}

function loadImage(url) {
    return new Promise((resolve, reject) => {
        const image = new Image()
        image.decoding = 'async'
        image.onload = () => resolve(image)
        image.onerror = () => reject(new Error('Kunne ikke generere eksportforhåndsvisning.'))
        image.src = url
    })
}

async function createExportCanvas(layers) {
    const svg = createExportSvg(layers)
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    try {
        const image = await loadImage(url)
        const canvas = document.createElement('canvas')
        canvas.width = EXPORT_SVG_WIDTH
        canvas.height = EXPORT_SVG_HEIGHT

        const context = canvas.getContext('2d')
        if (!context) throw new Error('Kunne ikke opprette canvas-kontekst.')
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.drawImage(image, 0, 0, canvas.width, canvas.height)

        return canvas
    } finally {
        URL.revokeObjectURL(url)
    }
}

function canvasToBlob(canvas, type) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (!blob) {
                reject(new Error('Kunne ikke opprette eksportfil.'))
                return
            }

            resolve(blob)
        }, type)
    })
}

function concatUint8Arrays(chunks, totalLength) {
    const result = new Uint8Array(totalLength)
    let offset = 0

    chunks.forEach(chunk => {
        result.set(chunk, offset)
        offset += chunk.length
    })

    return result
}

function escapePdfString(value) {
    return String(value ?? '')
        .replaceAll('\\', '\\\\')
        .replaceAll('(', '\\(')
        .replaceAll(')', '\\)')
}

function formatPdfDate(date = new Date()) {
    return [
        date.getFullYear(),
        padNumber(date.getMonth() + 1),
        padNumber(date.getDate()),
        padNumber(date.getHours()),
        padNumber(date.getMinutes()),
        padNumber(date.getSeconds()),
    ].join('')
}

function base64ToUint8Array(base64Value) {
    const binary = window.atob(base64Value)
    const bytes = new Uint8Array(binary.length)

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index)
    }

    return bytes
}

function createPdfDocument(jpegDataUrl, imageWidth, imageHeight, title) {
    const base64Value = jpegDataUrl.replace(/^data:image\/jpeg;base64,/, '')
    const jpegBytes = base64ToUint8Array(base64Value)
    const encoder = new TextEncoder()
    const page =
        imageWidth >= imageHeight
            ? { width: 842, height: 595 }
            : { width: 595, height: 842 }
    const margin = 30
    const scale = Math.min(
        (page.width - margin * 2) / imageWidth,
        (page.height - margin * 2) / imageHeight
    )
    const drawWidth = Number((imageWidth * scale).toFixed(2))
    const drawHeight = Number((imageHeight * scale).toFixed(2))
    const offsetX = Number(((page.width - drawWidth) / 2).toFixed(2))
    const offsetY = Number(((page.height - drawHeight) / 2).toFixed(2))
    const contentStream = `q
${drawWidth} 0 0 ${drawHeight} ${offsetX} ${offsetY} cm
/Im0 Do
Q
`

    const chunks = []
    const offsets = [0]
    let totalLength = 0

    function pushText(text) {
        const bytes = encoder.encode(text)
        chunks.push(bytes)
        totalLength += bytes.length
    }

    function pushBytes(bytes) {
        chunks.push(bytes)
        totalLength += bytes.length
    }

    pushText('%PDF-1.3\n%\u00e2\u00e3\u00cf\u00d3\n')

    offsets[1] = totalLength
    pushText('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')

    offsets[2] = totalLength
    pushText('2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n')

    offsets[3] = totalLength
    pushText(`3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Resources << /ProcSet [/PDF /ImageC] /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>
endobj
`)

    offsets[4] = totalLength
    pushText(`4 0 obj
<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>
stream
`)
    pushBytes(jpegBytes)
    pushText('\nendstream\nendobj\n')

    offsets[5] = totalLength
    pushText(`5 0 obj
<< /Length ${encoder.encode(contentStream).length} >>
stream
${contentStream}endstream
endobj
`)

    offsets[6] = totalLength
    pushText(`6 0 obj
<< /Title (${escapePdfString(title)}) /Creator (GeoMCP SDK) /Producer (GeoMCP SDK) /CreationDate (D:${formatPdfDate()}) >>
endobj
`)

    const xrefStart = totalLength
    pushText('xref\n0 7\n0000000000 65535 f \n')

    for (let index = 1; index <= 6; index += 1) {
        pushText(`${String(offsets[index]).padStart(10, '0')} 00000 n \n`)
    }

    pushText(`trailer
<< /Size 7 /Root 1 0 R /Info 6 0 R >>
startxref
${xrefStart}
%%EOF`)

    return concatUint8Arrays(chunks, totalLength)
}

export function sanitizeFilenameSegment(value, fallback = 'eksport') {
    return toFilenameSafeText(value) || fallback
}

export function countLayerFeatures(layer) {
    return getLayerFeatures(layer).length
}

export function downloadLayersAsGeoJSON(layers, options = {}) {
    downloadJsonFile(createFeatureCollection(layers), {
        ...options,
        extension: 'geojson',
        mimeType: 'application/geo+json',
    })
}

export function downloadLayersAsJSON(layers, options = {}) {
    downloadJsonFile(createJsonExport(layers), {
        ...options,
        extension: 'json',
        mimeType: 'application/json',
    })
}

export async function downloadLayersAsPNG(layers, options = {}) {
    const canvas = await createExportCanvas(layers)
    const filename = resolveFilename({
        ...options,
        extension: 'png',
    })
    const blob = await canvasToBlob(canvas, 'image/png')
    downloadBlob(blob, filename)
}

export async function downloadLayersAsPDF(layers, options = {}) {
    const canvas = await createExportCanvas(layers)
    const filename = resolveFilename({
        ...options,
        extension: 'pdf',
    })
    const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92)
    const pdfBytes = createPdfDocument(jpegDataUrl, canvas.width, canvas.height, 'Kartlag eksport')

    downloadBlob(new Blob([pdfBytes], { type: 'application/pdf' }), filename)
}
