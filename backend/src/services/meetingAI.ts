// Meeting analysis via the Claude API (Anthropic Messages API), called
// server-side only. The API key never leaves the backend.

const ANTHROPIC_BASE_URL = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com'
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5'
const ANTHROPIC_VERSION = '2023-06-01'

// Fixed 8-stage build-phase tagging for meeting follow-ups — see the
// comment above `model FollowUp` in schema.prisma for why this is
// intentionally separate from the MilestonePhase enum used elsewhere.
export const STAGES = [
  'site_foundation',
  'framing',
  'rough_in',
  'insulation_drywall',
  'interior_finishes',
  'exterior_sitework',
  'fixtures_systems',
  'punch_closeout',
] as const

export type Stage = typeof STAGES[number]
export type Owner = 'rob' | 'client'

const DEFAULT_STAGE: Stage = 'interior_finishes'

export interface AnalyzedFollowUp {
  title: string
  details: string
  dueDate: string | null // ISO date (YYYY-MM-DD) or null
  tag: string | null // short label, e.g. "Plumber", "Mason", "Decision"
  owner: Owner
  stage: Stage
}

export interface MeetingAnalysis {
  title: string
  attendees: string | null
  confirmed: string[]
  followUps: AnalyzedFollowUp[]
}

/** Thrown when the AI cannot be reached / is misconfigured. Message is UI-safe. */
export class MeetingAIError extends Error {}

const SYSTEM_PROMPT = `You are the meeting follow-up assistant for Rob, a busy custom-home builder who runs his business himself. He manages everything personally — there are no employees to delegate to, so every follow-up is his to do.

Granola already gives Rob a narrative summary of the meeting elsewhere — your job is NOT to repeat that. Your job is to turn the meeting into "who needs to do what, and where in the build it falls," at a glance.

Return ONLY a single JSON object (no prose, no markdown fences) with exactly these keys:
- "title": a short descriptive title for the meeting, inferred from the content.
- "attendees": a short comma-separated list of names if the transcript makes them clear (e.g. "Rob, John (framer), the Hendersons"), otherwise null. Do not guess if it's unclear.
- "confirmed": an array of short bullet strings for settled facts/decisions with NO pending action — materials chosen, layout finalized, prices agreed, etc. These must NOT also appear in followUps. Aim for the 3-6 most useful bullets, not an exhaustive transcript recap. Empty array if nothing was settled.
- "followUps": at most 5-6 items TOTAL (combining both owners) — still selective, only genuine actions someone needs to schedule or track, never a restatement of something in "confirmed". Each item is an object with:
    - "title": a concrete action, phrased as something to DO ("Text the homeowners the budget list"), never as something that happened or was discussed.
    - "details": one line of useful context, or "".
    - "dueDate": an ISO date string "YYYY-MM-DD" when the transcript implies timing (e.g. "by next Friday", "before the pour"); otherwise null. Interpret relative dates against the meeting date provided.
    - "owner": "rob" if Rob does it himself — including "talk to trade partner X about Y", that is still Rob's action — or "client" if it's blocked on the homeowner deciding, approving, or providing something.
    - "stage": the single best-fit build stage for this task, chosen from EXACTLY these 8 keys (use the key string itself, nothing else): "site_foundation", "framing", "rough_in", "insulation_drywall", "interior_finishes", "exterior_sitework", "fixtures_systems", "punch_closeout". Never invent a new stage name.
    - "tag": a short (one or two word) label for at-a-glance scanning — the trade or person it concerns if there is one (e.g. "Plumber", "Mason", "Electrician", "Homeowners"), or "Decision" if it's about a choice/approval rather than a specific trade. Use null only if nothing sensible fits.

Do not duplicate content between "confirmed" and "followUps": confirmed captures what was decided or is settled with nothing left to do; followUps are only forward-looking actions someone must actively take. If there are no real action items, return an empty array — do not pad it to reach 5-6.`

/**
 * Find the first complete top-level {...} object in text, respecting string
 * boundaries (so braces inside string values, or stray braces in any prose
 * around the JSON, can't throw off the match). Returns null if the braces
 * never balance — i.e. the response was cut off before the object closed.
 */
function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (escaped) { escaped = false; continue }
      if (ch === '\\') { escaped = true; continue }
      if (ch === '"') inString = false
      continue
    }
    if (ch === '"') { inString = true; continue }
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

/**
 * Escape raw control characters (literal newlines/tabs) found inside JSON
 * string literals. LLMs frequently emit a real newline inside a string value
 * (e.g. a multi-sentence "details" field) instead of the escaped `\n` JSON
 * requires — this is the single most common way an otherwise-correct-looking
 * response fails strict JSON.parse.
 */
function escapeRawControlCharsInStrings(text: string): string {
  let out = ''
  let inString = false
  let escaped = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (!inString) {
      if (ch === '"') inString = true
      out += ch
      continue
    }
    if (escaped) { out += ch; escaped = false; continue }
    if (ch === '\\') { out += ch; escaped = true; continue }
    if (ch === '"') { inString = false; out += ch; continue }
    if (ch === '\n') { out += '\\n'; continue }
    if (ch === '\r') { out += '\\r'; continue }
    if (ch === '\t') { out += '\\t'; continue }
    out += ch
  }
  return out
}

/** Drop trailing commas before a closing } or ] — another common LLM slip. */
function stripTrailingCommas(text: string): string {
  return text.replace(/,(\s*[}\]])/g, '$1')
}

/** Strip markdown code fences, isolate the JSON object, repair common LLM
 * JSON artifacts, then parse. Logs the raw response on any failure so a
 * real production case can be diagnosed from the server logs. */
function parseAnalysisJson(raw: string): MeetingAnalysis {
  let text = raw.trim()
  // Remove ```json ... ``` or ``` ... ``` fences if present.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) text = fence[1].trim()

  const extracted = extractJsonObject(text)
  if (!extracted) {
    console.error(
      `Meeting analysis: no complete JSON object found in the AI response (likely truncated). Raw response (first 4000 chars):\n${raw.slice(0, 4000)}`
    )
    throw new MeetingAIError(
      'The AI response was cut off before it finished. Please try again — if it keeps happening, try a shorter transcript.'
    )
  }
  text = stripTrailingCommas(escapeRawControlCharsInStrings(extracted))

  let obj: any
  try {
    obj = JSON.parse(text)
  } catch (err) {
    console.error(
      `Meeting analysis: failed to parse AI response as JSON (${(err as Error).message}). Raw response (first 4000 chars):\n${raw.slice(0, 4000)}`
    )
    throw new MeetingAIError('The AI returned an unreadable response. Please try again.')
  }
  const followUps: AnalyzedFollowUp[] = Array.isArray(obj.followUps)
    ? obj.followUps
        .filter((f: any) => f && typeof f.title === 'string' && f.title.trim())
        .map((f: any) => ({
          title: String(f.title).trim(),
          details: typeof f.details === 'string' ? f.details.trim() : '',
          dueDate: typeof f.dueDate === 'string' && f.dueDate.trim() ? f.dueDate.trim() : null,
          tag: typeof f.tag === 'string' && f.tag.trim() ? f.tag.trim().slice(0, 24) : null,
          owner: f.owner === 'client' ? 'client' : 'rob',
          stage: STAGES.includes(f.stage) ? f.stage : DEFAULT_STAGE,
        }))
        // Defensive cap — the prompt asks for 5-6, but don't trust the model to always comply.
        .slice(0, 6)
    : []
  const confirmed: string[] = Array.isArray(obj.confirmed)
    ? obj.confirmed
        .filter((c: any) => typeof c === 'string' && c.trim())
        .map((c: string) => c.trim())
        // Defensive cap, same reasoning as followUps below.
        .slice(0, 8)
    : []
  return {
    title: typeof obj.title === 'string' && obj.title.trim() ? obj.title.trim() : 'Untitled meeting',
    attendees: typeof obj.attendees === 'string' && obj.attendees.trim() ? obj.attendees.trim() : null,
    confirmed,
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
        // Attendees + confirmed[] + up to 6 follow-ups (each with title,
        // details, dueDate, tag, owner, stage) can add up for a real
        // meeting — too low a budget here truncates the JSON mid-object,
        // which used to surface as an opaque "unreadable response" error.
        max_tokens: 4096,
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
  // The API tells us directly when it ran out of budget mid-response —
  // trust that over trying to parse what is known to be incomplete JSON.
  if (data?.stop_reason === 'max_tokens') {
    console.error(
      `Meeting analysis: Claude response truncated (stop_reason=max_tokens). Raw response (first 4000 chars):\n${textOut.slice(0, 4000)}`
    )
    throw new MeetingAIError(
      'The meeting was too long for the AI to fully analyze in one pass. Please try again, or trim the transcript a bit.'
    )
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
