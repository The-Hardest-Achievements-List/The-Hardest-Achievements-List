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

export function getNotesTooltipMaxWidth() {
    if (typeof window === 'undefined') return 260
    // Keep the hover panel modest vs screen: ~44vw, hard-capped.
    return Math.max(180, Math.min(260, Math.floor(window.innerWidth * 0.44), window.innerWidth - 32))
}

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

export function getNotesPreview(notes, maxLength = getNotesPreviewMaxLength()) {
    const parts = getNotesParts(notes)
    if (!parts.length) return null
    return truncateNotesPreview(parts[0], maxLength).text
}

export function hasNotesBeyondPreview(notes, maxLength = getNotesPreviewMaxLength()) {
    const parts = getNotesParts(notes)
    if (parts.length > 1) return true
    if (parts.length === 1) return truncateNotesPreview(parts[0], maxLength).truncated
    return false
}

export function getNotesExtraCount(notes) {
    return Math.max(0, getNotesParts(notes).length - 1)
}

export function getNotesFullText(notes) {
    const parts = getNotesParts(notes)
    return parts.length ? parts.join('\n\n') : null
}

export function hasNotes(notes) {
    return getNotesParts(notes).length > 0
}

const PARTIAL_DATE_RE = /^(\d{4})-(\d{2}|\?\?)-(\d{2}|\?\?)$/

export function isValidDate(iso) {
    if (!iso || typeof iso !== 'string') return false
    // Reject partial timeline dates (`2015-10-??`)
    if (iso.includes('?')) return false
    const d = new Date(iso)
    return !Number.isNaN(d.getTime())
}

/** True for full ISO dates or partial timeline dates like `2015-10-??`. */
export function isFormattableDate(iso) {
    if (isValidDate(iso)) return true
    if (!iso || typeof iso !== 'string') return false
    const match = iso.match(PARTIAL_DATE_RE)
    if (!match) return false
    const [, , month, day] = match
    if (month !== '??') {
        const monthNum = Number(month)
        if (monthNum < 1 || monthNum > 12) return false
    }
    if (day !== '??') {
        const dayNum = Number(day)
        if (dayNum < 1 || dayNum > 31) return false
    }
    return true
}

export function formatDate(iso) {
    if (!iso || typeof iso !== 'string') return '—'

    const partial = iso.match(PARTIAL_DATE_RE)
    if (partial && (partial[2] === '??' || partial[3] === '??')) {
        if (!isFormattableDate(iso)) return '—'
        const [, year, month, day] = partial
        const yearShort = year.slice(2)
        const monthLabel =
            month === '??' ? '?' : MONTHS[Number(month) - 1]
        const dayLabel = day === '??' ? '?' : String(Number(day))
        return `${dayLabel} ${monthLabel} ${yearShort}`
    }

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

function getNeighborDateBounds(entries, index) {
    return {
        prevDate: findNeighborDate(entries, index, -1),
        nextDate: findNeighborDate(entries, index, 1),
    }
}

/** Sortable ms timestamp; missing dates use neighbor midpoint (or the known side). */
export function getInferredDateTimestamp(entries, index) {
    const entry = entries[index]
    if (isValidDate(entry.date)) return new Date(entry.date).getTime()

    const { prevDate, nextDate } = getNeighborDateBounds(entries, index)
    const prevT = prevDate ? new Date(prevDate).getTime() : null
    const nextT = nextDate ? new Date(nextDate).getTime() : null

    if (prevT != null && nextT != null) return (prevT + nextT) / 2
    if (prevT != null) return prevT
    if (nextT != null) return nextT
    return null
}

function buildTimelineDateLabelAt(entries, index) {
    const entry = entries[index]

    if (isFormattableDate(entry.date)) {
        return formatDate(entry.date)
    }

    const { prevDate, nextDate } = getNeighborDateBounds(entries, index)

    if (prevDate && nextDate) {
        const earlier =
            new Date(prevDate).getTime() <= new Date(nextDate).getTime()
                ? prevDate
                : nextDate
        const later = earlier === prevDate ? nextDate : prevDate
        return `${formatDate(earlier)} – ${formatDate(later)}`
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

export function buildTimelineDateSortMap(entries) {
    const map = new Map()
    if (!Array.isArray(entries)) return map

    for (let i = 0; i < entries.length; i++) {
        map.set(getTimelineEntryKey(entries[i]), getInferredDateTimestamp(entries, i))
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

const YT_THUMB_HOST = 'i.ytimg.com'

/** Prefer reliable sizes first — maxres/sd often 200 OK with a 120×90 stub. */
export function getYouTubeThumbnailUrls(videoId) {
    return [
        `https://${YT_THUMB_HOST}/vi/${videoId}/hqdefault.jpg`,
        `https://${YT_THUMB_HOST}/vi/${videoId}/mqdefault.jpg`,
    ]
}

export function getYouTubeMaxResThumbnailUrl(videoId) {
    if (!videoId) return null
    return `https://${YT_THUMB_HOST}/vi/${videoId}/maxresdefault.jpg`
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

    // Prefer the preconnected ytimg CDN over img.youtube.com redirects.
    if (/^https?:\/\/img\.youtube\.com\/vi\//i.test(trimmed)) {
        return trimmed.replace(/^(https?:\/\/)img\.youtube\.com/i, `$1${YT_THUMB_HOST}`)
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
        add(`https://levelthumbs.prevter.me/thumbnail/${levelID}`)
        add(`https://levelthumbs.prevter.me/thumbnail/${levelID}/small`)
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
