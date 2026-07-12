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

export function formatDisplayVersion(value) {
    if (typeof value === 'string') {
        const trimmed = value.trim()
        if (!trimmed) return null
        if (trimmed === 'Alpha' || trimmed === 'Beta') return trimmed
        if (!/^\d+(\.\d+)?$/.test(trimmed)) return null
        const parsed = Number(trimmed)
        if (!Number.isFinite(parsed) || parsed <= 0) return null
        if (Number.isInteger(parsed)) return `${parsed}.0`
        return String(parsed)
    }
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        if (Number.isInteger(value)) return `${value}.0`
        const asText = String(value)
        if (/^\d+\.\d+$/.test(asText)) return asText
    }
    return null
}

/** Clean note parts from a string or string[]. */
export function getNotesParts(notes) {
    if (typeof notes === 'string') {
        const trimmed = notes.trim()
        return trimmed ? [trimmed] : []
    }
    if (Array.isArray(notes)) {
        return notes
            .filter((item) => typeof item === 'string')
            .map((item) => item.trim())
            .filter(Boolean)
    }
    return []
}

/** Max tooltip width in px, scaled to the viewport. */
export function getNotesTooltipMaxWidth() {
    if (typeof window === 'undefined') return 260
    // Keep the hover panel modest vs screen: ~44vw, hard-capped.
    return Math.max(180, Math.min(260, Math.floor(window.innerWidth * 0.44), window.innerWidth - 32))
}

/** Approx. chars that fit in the note tooltip at the current viewport width. */
export function getNotesPreviewMaxLength() {
    const tooltipMaxWidth = getNotesTooltipMaxWidth()
    // ~6.5px per character at 12px; keep about 3–3.5 lines of preview.
    return Math.max(72, Math.floor((tooltipMaxWidth / 6.5) * 3.25))
}

/**
 * Truncate preview text. Breaks on whitespace when possible; only hard-cuts
 * mid-"word" when there is no space/newline in the allowed window
 * (e.g. a thousand-character unbroken string).
 */
export function truncateNotesPreview(text, maxLength) {
    if (typeof text !== 'string') {
        return { text: '', truncated: false }
    }
    if (text.length <= maxLength) {
        return { text, truncated: false }
    }

    const sliceAt = Math.max(0, maxLength - 1)
    const cut = text.slice(0, sliceAt)
    const boundary = Math.max(
        cut.lastIndexOf(' '),
        cut.lastIndexOf('\n'),
        cut.lastIndexOf('\t'),
    )

    // No whitespace in range → unbroken megastring; hard-cut is intentional.
    if (boundary === -1) {
        return { text: `${cut}…`, truncated: true }
    }

    return { text: `${cut.slice(0, boundary).trimEnd()}…`, truncated: true }
}

/**
 * Hover/preview text: full string (possibly length-truncated), or only the
 * first array element (also length-truncated when needed).
 */
export function getNotesPreview(notes, maxLength = getNotesPreviewMaxLength()) {
    const parts = getNotesParts(notes)
    if (!parts.length) return null
    return truncateNotesPreview(parts[0], maxLength).text
}

/** True when hover preview hides more content than it shows. */
export function hasNotesBeyondPreview(notes, maxLength = getNotesPreviewMaxLength()) {
    const parts = getNotesParts(notes)
    if (parts.length > 1) return true
    if (parts.length === 1) return truncateNotesPreview(parts[0], maxLength).truncated
    return false
}

/** Extra array items beyond the first previewed note. */
export function getNotesExtraCount(notes) {
    return Math.max(0, getNotesParts(notes).length - 1)
}

/** Modal/full text: full string, or all array elements joined. */
export function getNotesFullText(notes) {
    const parts = getNotesParts(notes)
    return parts.length ? parts.join('\n\n') : null
}

export function hasNotes(notes) {
    return getNotesParts(notes).length > 0
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

/** True for YouTube / Twitch achievement video links. */
export function isWatchableAchievementUrl(url) {
    if (!url || typeof url !== 'string') return false
    if (getYouTubeVideoId(url)) return true

    try {
        const parsed = new URL(fixYouTubeUrlScheme(url.trim()))
        const host = parsed.hostname.replace(/^www\./, '').toLowerCase()
        return host === 'twitch.tv' || host === 'clips.twitch.tv'
    } catch {
        return /(?:^|\.)(?:twitch\.tv|clips\.twitch\.tv)(?:\/|$)/i.test(url)
    }
}

export function normalizeImageUrl(image) {
    return normalizeThumbnail(image)
}

export function normalizeProofUrl(proof) {
    if (!proof || typeof proof !== 'string') return null
    const trimmed = proof.trim()
    if (!trimmed || !/^https?:\/\//i.test(trimmed)) return null
    return trimmed
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
