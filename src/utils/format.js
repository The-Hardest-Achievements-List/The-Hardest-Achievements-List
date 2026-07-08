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

export function isValidDate(iso) {
    if (!iso || typeof iso !== 'string') return false
    const d = new Date(iso)
    return !Number.isNaN(d.getTime())
}

export function formatDate(iso) {
    if (!isValidDate(iso)) return '—'
    const d = new Date(iso)
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
}

function findNeighborDate(entries, startIndex, direction) {
    for (let i = startIndex + direction; i >= 0 && i < entries.length; i += direction) {
        if (isValidDate(entries[i].date)) return entries[i].date
    }
    return null
}

export function getTimelineEntryKey(entry) {
    return `${entry.levelID ?? ''}\0${entry.name ?? ''}\0${entry.date ?? ''}\0${entry.player ?? ''}`
}

function buildTimelineDateLabelAt(entries, index) {
    const entry = entries[index]

    if (isValidDate(entry.date)) {
        return formatDate(entry.date)
    }

    const prevDate = findNeighborDate(entries, index, -1)
    const nextDate = findNeighborDate(entries, index, 1)

    if (prevDate && nextDate) {
        return `${formatDate(prevDate)} – ${formatDate(nextDate)}`
    }
    if (prevDate) {
        return `${formatDate(prevDate)} – ?`
    }
    if (nextDate) {
        return `? – ${formatDate(nextDate)}`
    }
    return '—'
}

export function buildTimelineDateLabelMap(entries) {
    const map = new Map()
    if (!Array.isArray(entries)) return map

    for (let i = 0; i < entries.length; i++) {
        map.set(getTimelineEntryKey(entries[i]), buildTimelineDateLabelAt(entries, i))
    }

    return map
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
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/
    ]

    for (const pattern of patterns) {
        const match = url.match(pattern)
        if (match) return match[1]
    }

    return null
}

function fixYouTubeUrlScheme(url) {
    return url
        .replace(/^https:\/(?!\/)/, 'https://')
        .replace(/^http:\/(?!\/)/, 'http://')
}

export function normalizeYouTubeUrl(url) {
    if (!url || typeof url !== 'string') return url

    const trimmed = url.trim()
    if (!trimmed) return url

    const fixed = fixYouTubeUrlScheme(trimmed)
    const videoId = getYouTubeVideoId(fixed)

    if (videoId) {
        const start = getYouTubeStartSeconds(fixed)
        const base = `https://youtu.be/${videoId}`
        return start != null ? `${base}?t=${start}` : base
    }

    try {
        const parsed = new URL(fixed.startsWith('http') ? fixed : `https://${fixed}`)
        const host = parsed.hostname.replace(/^www\./, '')
        if (host !== 'youtube.com' && host !== 'youtu.be' && host !== 'm.youtube.com') {
            return trimmed
        }

        const start = getYouTubeStartSeconds(fixed)
        const base = `${parsed.protocol}//${parsed.host}${parsed.pathname}`
        return start != null ? `${base}?t=${start}` : base
    } catch {
        return trimmed
    }
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
        `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        `https://img.youtube.com/vi/${videoId}/default.jpg`,
    ]
}

export function normalizeThumbnail(thumbnail) {
    if (!thumbnail || typeof thumbnail !== 'string') return null

    const trimmed = thumbnail.trim()
    if (!trimmed || trimmed === '—' || trimmed === '-') return null
    if (!/^https?:\/\//i.test(trimmed)) return null

    if (trimmed.includes('github.com') && trimmed.includes('/blob/')) {
        return trimmed
            .replace('https://github.com/', 'https://raw.githubusercontent.com/')
            .replace('/blob', '')
            .replace(/\?raw=true$/, '')
    }

    return trimmed
}

const memoizedGetThumbnailUrlSequence = memoize(function getThumbnailUrlSequenceImpl(thumbnail, showcaseVideo, playerVideo, levelID) {
    const urls = []
    const add = (url) => {
        if (url && !urls.includes(url)) urls.push(url)
    }

    const explicit = normalizeThumbnail(thumbnail)
    if (explicit) add(explicit)

    if (levelID) {
        add(`https://levelthumbs.prevter.me/thumbnail/${levelID}/high`)
        add(`https://levelthumbs.prevter.me/thumbnail/${levelID}/small`)
        add(`https://levelthumbs.prevter.me/thumbnail/${levelID}`)
    }

    const showcaseVideoId = showcaseVideo ? getYouTubeVideoId(showcaseVideo) : null
    const playerVideoId = playerVideo ? getYouTubeVideoId(playerVideo) : null
    if (showcaseVideoId) {
        getYouTubeThumbnailUrls(showcaseVideoId).forEach(add)
    }
    if (playerVideoId && playerVideoId !== showcaseVideoId) {
        getYouTubeThumbnailUrls(playerVideoId).forEach(add)
    }

    return urls
}, 500)

export function getThumbnailUrlSequence(thumbnail, showcaseVideo, playerVideo, levelID) {
    return memoizedGetThumbnailUrlSequence(thumbnail, showcaseVideo, playerVideo, levelID)
}
