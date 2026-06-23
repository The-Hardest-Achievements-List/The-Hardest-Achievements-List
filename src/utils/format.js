const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

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
        /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/
    ]

    for (const pattern of patterns) {
        const match = url.match(pattern)
        if (match) return match[1]
    }

    return null
}

export function getYouTubeThumbnailUrls(videoId) {

    return [
        `https://img.youtube.com/vi/${videoId}/hq2.jpg`,
        `https://img.youtube.com/vi/${videoId}/hq1.jpg`,
        `https://img.youtube.com/vi/${videoId}/hq3.jpg`
    ]
}

export function getThumbnailUrlSequence(thumbnail, showcaseVideo, playerVideo, levelID) {
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
}