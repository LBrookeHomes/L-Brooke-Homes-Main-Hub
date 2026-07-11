// Meeting analysis via the Claude API (Anthropic Messages API), called
// server-side only. The API key never leaves the backend.

const ANTHROPIC_BASE_URL = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com'
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5'
const ANTHROPIC_VERSION = '2023-06-01'

export interface AnalyzedFollowUp {
  title: string
  details: string
  dueDate: string | null // ISO date (YYYY-MM-DD) or null
}

export interface MeetingAnalysis {
  title: string
  summary: string
  decisions: string
  followUps: AnalyzedFollowUp[]
}

/** Thrown when the AI cannot be reached / is misconfigured. Message is UI-safe. */
export class MeetingAIError extends Error {}

const SYSTEM_PROMPT = `You are the meeting follow-up assistant for Rob, a busy custom-home builder who runs his business himself. He manages everything personally — there are no employees to delegate to, so every follow-up is his to do.

Given a meeting transcript, produce a tight, practical brief. Write for someone with no time to waste: skip filler, surface what actually matters.

Return ONLY a single JSON object (no prose, no markdown fences) with exactly these keys:
- "title": a short descriptive title for the meeting, inferred from the content.
- "summary": the crux of the meeting — what it was about and what came out of it, in a few clear sentences or short bullet lines.
- "decisions": the key decisions made and any risks or open concerns — what was decided, or what's at risk. Newline-separated list. Empty string if none.
- "followUps": at most the 2-3 most important, time-sensitive action items Rob genuinely needs to schedule and not forget. Do not list every discussion point — be selective. Each item is an object with:
    - "title": a concrete action Rob himself takes, phrased as something to DO ("Text the homeowners the budget list"), never as something that happened or was discussed ("Budget list was discussed" is wrong — that belongs in decisions, not here).
    - "details": one line of useful context, or "".
    - "dueDate": an ISO date string "YYYY-MM-DD" when the transcript implies timing (e.g. "by next Friday", "before the pour"); otherwise null. Interpret relative dates against the meeting date provided.

Do not duplicate content between "decisions" and "followUps": decisions capture what was decided or is at risk; followUps are only forward-looking actions Rob must actively do. If a decision doesn't require Rob to do something next, it belongs only in decisions, not as a follow-up. If there are no real action items, return an empty array — do not pad it to reach 2-3.`

/** Strip markdown code fences and isolate the JSON object, then parse. */
function parseAnalysisJson(raw: string): MeetingAnalysis {
  let text = raw.trim()
  // Remove ```json ... ``` or ``` ... ``` fences if present.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) text = fence[1].trim()
  // Fall back to the outermost { ... } if there is surrounding prose.
  if (!text.startsWith('{')) {
    const first = text.indexOf('{')
    const last = text.lastIndexOf('}')
    if (first !== -1 && last > first) text = text.slice(first, last + 1)
  }
  let obj: any
  try {
    obj = JSON.parse(text)
  } catch {
    throw new MeetingAIError('The AI returned an unreadable response. Please try again.')
  }
  const followUps: AnalyzedFollowUp[] = Array.isArray(obj.followUps)
    ? obj.followUps
        .filter((f: any) => f && typeof f.title === 'string' && f.title.trim())
        .map((f: any) => ({
          title: String(f.title).trim(),
          details: typeof f.details === 'string' ? f.details.trim() : '',
          dueDate: typeof f.dueDate === 'string' && f.dueDate.trim() ? f.dueDate.trim() : null,
        }))
        // Defensive cap — the prompt asks for 2-3, but don't trust the model to always comply.
        .slice(0, 3)
    : []
  return {
    title: typeof obj.title === 'string' && obj.title.trim() ? obj.title.trim() : 'Untitled meeting',
    summary: typeof obj.summary === 'string' ? obj.summary.trim() : '',
    decisions: typeof obj.decisions === 'string' ? obj.decisions.trim() : '',
    followUps,
  }
}

export async function analyzeMeeting(
  transcript: string,
  meetingDate?: Date
): Promise<MeetingAnalysis> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new MeetingAIError('AI not configured — add ANTHROPIC_API_KEY in Railway.')
  }
  const dateLine = meetingDate
    ? `The meeting took place on ${meetingDate.toISOString().slice(0, 10)}.`
    : `Assume the meeting took place today, ${new Date().toISOString().slice(0, 10)}.`

  let res: Response
  try {
    res = await fetch(`${ANTHROPIC_BASE_URL}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `${dateLine}\n\nMeeting transcript:\n"""\n${transcript}\n"""\n\nReturn the JSON brief now.`,
          },
        ],
      }),
    })
  } catch (err) {
    throw new MeetingAIError('Could not reach the AI service. Please try again shortly.')
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`Anthropic API error ${res.status}: ${body.slice(0, 500)}`)
    if (res.status === 401) throw new MeetingAIError('AI key rejected — check ANTHROPIC_API_KEY in Railway.')
    throw new MeetingAIError('The AI service returned an error. Please try again shortly.')
  }

  const data: any = await res.json()
  const textOut: string = Array.isArray(data?.content)
    ? data.content.filter((b: any) => b?.type === 'text').map((b: any) => b.text).join('\n')
    : ''
  if (!textOut.trim()) {
    throw new MeetingAIError('The AI returned an empty response. Please try again.')
  }
  return parseAnalysisJson(textOut)
}

const MIN_READABLE = 60

/** Recursively collect prose-like strings from parsed JSON (a Next.js data
 * island, ld+json, etc.). Filters out ids, urls, paths, class names. */
function collectProse(node: unknown, out: string[], depth = 0): void {
  if (depth > 12 || out.length > 4000) return
  if (typeof node === 'string') {
    const s = node.trim()
    if (
      s.length >= 20 &&
      s.includes(' ') &&
      !/^https?:\/\//i.test(s) &&
      !/^[/{[<]/.test(s) &&
      !/^[\w.-]+\.(js|css|png|jpe?g|svg|gif|woff2?|ico|json)$/i.test(s)
    ) {
      out.push(s)
    }
    return
  }
  if (Array.isArray(node)) { for (const v of node) collectProse(v, out, depth + 1); return }
  if (node && typeof node === 'object') { for (const v of Object.values(node)) collectProse(v, out, depth + 1) }
}

/** Extract readable text from embedded JSON script blobs (e.g. Next.js
 * __NEXT_DATA__). Many SPAs ship the page's content this way even when the
 * visible DOM is rendered by JS — our tag-stripping pass would discard it. */
export function textFromJsonBlobs(html: string): string {
  const re = /<script[^>]*type=["'](?:application\/json|application\/ld\+json)["'][^>]*>([\s\S]*?)<\/script>/gi
  const prose: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    try { collectProse(JSON.parse(m[1].trim()), prose) } catch { /* not valid JSON */ }
  }
  const seen = new Set<string>()
  return prose.filter((s) => (seen.has(s) ? false : (seen.add(s), true))).join('\n')
}

/** Best-effort readable-text extraction: try embedded JSON data islands and
 * plain tag-stripping, keep whichever yields more content. */
export function extractReadableText(html: string): string {
  const fromJson = textFromJsonBlobs(html)
  const fromTags = htmlToText(html)
  return fromJson.length > fromTags.length ? fromJson : fromTags
}

/**
 * Best-effort fetch + text extraction for a shared link (e.g. Granola).
 * Distinguishes the failure modes so the UI can guide the user precisely:
 * unreachable, blocked/non-200, or reachable-but-no-readable-text (typical of
 * a client-rendered SPA whose content only appears after JS runs).
 */
export async function fetchLinkText(url: string): Promise<string> {
  let res: Response
  try {
    res = await fetch(url, {
      redirect: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; LBrookeHomesHub/1.0)',
        accept: 'text/html,application/xhtml+xml',
      },
    })
  } catch {
    throw new MeetingAIError("Couldn't reach that link — please paste the meeting text instead.")
  }
  if (!res.ok) {
    throw new MeetingAIError(
      `Couldn't open that link (it returned ${res.status}) — please paste the meeting text instead.`
    )
  }
  const html = await res.text()
  const text = extractReadableText(html)
  console.log(
    `[link-fetch] ${url} status=${res.status} html=${html.length}B extracted=${text.trim().length}`
  )
  if (text.trim().length < MIN_READABLE) {
    // Reached the page but found no readable notes — the content is almost
    // certainly rendered in-browser by JavaScript (e.g. a Granola share page).
    throw new MeetingAIError(
      "Opened the link but couldn't find the notes on the page — they load in your browser, so please paste the transcript text instead."
    )
  }
  return text
}

/** Lightweight HTML → readable text: drop scripts/styles, strip tags, collapse whitespace. */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|li|h[1-6]|br|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
