const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const memoCache = new Map()

function memoize(fn, maxSize = 100) {
    return (...args) => {
        const key = JSON.stringify(args)
        if (memoCache.has(key)) {
            return memoCache.get(key)
        }
        const result = fn(...args)
        if (memoCache.size >= maxSize) {
            const firstKey = memoCache.keys().next().value
            memoCache.delete(firstKey)
        }
        memoCache.set(key, result)
        return result
    }
}

export function formatDate(iso) {
    if (!iso) return '—'
    const d = new Date(iso)
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
}

export function formatLength(seconds) {
    if (!seconds || seconds <= 0) return '—'

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    const parts = []
    if (hours > 0) parts.push(`${hours}h`)
    if (minutes > 0 || hours > 0) parts.push(`${minutes}m`)
    parts.push(`${secs}s`)

    return parts.join(' ')
}

export function getYouTubeVideoId(url) {
    if (!url) return null
    const patterns = [
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/
    ]

    for (const pattern of patterns) {
        const match = url.match(pattern)
        if (match) return match[1]
    }

    return null
}

function parseYouTubeTimeParam(value) {
    if (!value) return null
    const normalized = value.replace(/s$/i, '')
    if (/^\d+$/.test(normalized)) return parseInt(normalized, 10)

    const hours = normalized.match(/(\d+)h/i)?.[1]
    const minutes = normalized.match(/(\d+)m/i)?.[1]
    const seconds = normalized.match(/(\d+)s/i)?.[1] ?? normalized.match(/(\d+)$/)?.[1]
    let total = 0
    if (hours) total += parseInt(hours, 10) * 3600
    if (minutes) total += parseInt(minutes, 10) * 60
    if (seconds) total += parseInt(seconds, 10)
    return total > 0 ? total : null
}

export function getYouTubeStartSeconds(url) {
    if (!url) return null

    try {
        const parsed = new URL(url)
        const timeParam = parsed.searchParams.get('t') ?? parsed.searchParams.get('start')
        if (timeParam) return parseYouTubeTimeParam(timeParam)
    } catch {
        // fall through to regex for non-standard URLs
    }

    const match = url.match(/[?&#](?:t|start)=([^&#]+)/i)
    return match ? parseYouTubeTimeParam(match[1]) : null
}

export function getYouTubeEmbedUrl(url) {
    const videoId = getYouTubeVideoId(url)
    if (!videoId) return null

    const start = getYouTubeStartSeconds(url)
    const base = `https://www.youtube.com/embed/${videoId}`
    return start != null ? `${base}?start=${start}` : base
}

export function getYouTubeThumbnailUrls(videoId) {

    return [
        `https://img.youtube.com/vi/${videoId}/hq2.jpg`,
        `https://img.youtube.com/vi/${videoId}/hq1.jpg`,
        `https://img.youtube.com/vi/${videoId}/hq3.jpg`
    ]
}

const memoizedGetThumbnailUrlSequence = memoize(function getThumbnailUrlSequenceImpl(thumbnail, showcaseVideo, playerVideo, levelID) {
    const urls = []
    if (thumbnail) return [thumbnail]
    if (levelID) {
        urls.push(`https://levelthumbs.prevter.me/thumbnail/${levelID}/small`)
        urls.push(`https://levelthumbs.prevter.me/thumbnail/${levelID}`)
    }
    const showcaseVideoId = showcaseVideo ? getYouTubeVideoId(showcaseVideo) : null
    const playerVideoId = playerVideo ? getYouTubeVideoId(playerVideo) : null
    if (showcaseVideoId) {
        urls.push(...getYouTubeThumbnailUrls(showcaseVideoId))
    }
    if (playerVideoId && playerVideoId !== showcaseVideoId) {
        urls.push(...getYouTubeThumbnailUrls(playerVideoId))
    }

    return urls
}, 500)

export function getThumbnailUrlSequence(thumbnail, showcaseVideo, playerVideo, levelID) {
    return memoizedGetThumbnailUrlSequence(thumbnail, showcaseVideo, playerVideo, levelID)
}
