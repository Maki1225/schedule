import { OAuth2Client } from 'google-auth-library'
import { Context } from 'hono'
import { UserModel } from '../models/userModel'
import { getDecryptedTokens } from '../utils/encryptTokens'
import { Env } from '../types/hono'

const GOOGLE_API_TIMEOUT_MS = 15_000 // 15秒
const MAX_COURSES_PER_REQUEST = 50 // 1回のリクエストで取得するコース数上限
const MAX_CONCURRENT_REQUESTS = 5 // 並行リクエスト数上限

async function getAccessToken(userId: string | number): Promise<string> {
  const savedTokens = await UserModel.findGoogleTokens(userId)
  if (!savedTokens) {
    throw new Error('Googleアカウント情報が見つかりません。再ログインしてください。')
  }

  const decrypted = getDecryptedTokens({
    accessToken: savedTokens.google_access_token,
    refreshToken: savedTokens.google_refresh_token,
    expiryDate: savedTokens.google_token_expires_at,
  })

  const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  client.setCredentials({
    access_token: decrypted.accessToken || undefined,
    refresh_token: decrypted.refreshToken || undefined,
    expiry_date: decrypted.expiryDate || undefined,
  })

  if (
    !decrypted.refreshToken &&
    (!decrypted.accessToken ||
      (decrypted.expiryDate !== null &&
        decrypted.expiryDate <= Date.now()))
  ) {
    throw new Error('Google連携の有効期限が切れています。Googleアカウントで再ログインしてください。')
  }

  const accessToken = await client.getAccessToken()
  const refreshed = client.credentials
  if (!accessToken.token) {
    throw new Error('Google APIのアクセストークンを取得できませんでした。再ログインしてください。')
  }

  if (
    refreshed.access_token &&
    (refreshed.access_token !== decrypted.accessToken ||
      refreshed.expiry_date !== decrypted.expiryDate)
  ) {
    await UserModel.updateGoogleTokens(Number(userId), {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token || null,
      expiryDate: refreshed.expiry_date || null,
    })
  }

  return accessToken.token
}

async function googleGet<T>(accessToken: string, url: URL, timeoutMs = GOOGLE_API_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    })
  const body = await response.json().catch(() => ({})) as {
    error?: { message?: string }
  }
  if (!response.ok) {
    const detail = body.error?.message
    if (response.status === 401) {
      throw new Error(
        detail
          ? `Google連携の有効期限が切れています。Googleアカウントで再認証してください: ${detail}`
          : 'Google連携の有効期限が切れています。Googleアカウントで再認証してください。'
      )
    }
    if (response.status === 403) {
      throw new Error(
        detail
          ? `Google APIへのアクセスが拒否されました。Cloud ConsoleでAPIの有効化とOAuth権限を確認してください: ${detail}`
          : 'Google APIへのアクセスが拒否されました。Cloud ConsoleでAPIの有効化とOAuth権限を確認してください。'
      )
    }
    throw new Error(detail || `Google APIエラー (${response.status})`)
  }
    return body as T
  } finally {
    clearTimeout(timeoutId)
  }
}

async function withGoogleData<T>(
  c: Context<Env>,
  load: (accessToken: string) => Promise<T>
) {
  try {
    const accessToken = await getAccessToken(c.get('jwtPayload').id)
    return c.json(await load(accessToken))
  } catch (error) {
    console.error('Google APIデータ取得エラー:', error)
    const message = error instanceof Error ? error.message : 'Google APIデータを取得できませんでした。'
    const status = /再ログイン|再認証/.test(message) ? 409 : 502
    return c.json({ error: message }, status)
  }
}

interface GoogleCourse {
  id: string
  name: string
  courseState?: string
}

interface GoogleCoursework {
  id: string
  title: string
  description?: string
  alternateLink?: string
  state?: string
  creationTime?: string
  dueDate?: { year: number; month: number; day: number }
  dueTime?: { hours?: number; minutes?: number }
}

interface GoogleCalendarEvent {
  id: string
  status?: string
  summary?: string
  description?: string
  htmlLink?: string
  created?: string
  start?: { date?: string; dateTime?: string }
  end?: { date?: string; dateTime?: string }
}

function getAcademicYearRange(now = new Date()) {
  const dateParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(now)
  const year = Number(dateParts.find((part) => part.type === 'year')?.value)
  const month = Number(dateParts.find((part) => part.type === 'month')?.value)
  const startYear = month >= 4 ? year : year - 1

  return {
    start: new Date(`${startYear}-04-01T00:00:00+09:00`),
    end: new Date(`${startYear + 1}-04-01T00:00:00+09:00`),
    label: `${startYear}年度`,
  }
}

function createdThisAcademicYear(created: string | undefined, start: Date, end: Date) {
  if (!created) return false
  const createdAt = Date.parse(created)
  return Number.isFinite(createdAt) && createdAt >= start.getTime() && createdAt < end.getTime()
}

export const GoogleDataController = {
  async classroomCoursework(c: Context<Env>) {
    return withGoogleData(c, async (accessToken) => {
      const academicYear = getAcademicYearRange()
      const coursesUrl = new URL('https://classroom.googleapis.com/v1/courses')
      coursesUrl.searchParams.set('courseStates', 'ACTIVE')
      coursesUrl.searchParams.set('pageSize', '100')
      const coursesResult = await googleGet<{ courses?: GoogleCourse[] }>(
        accessToken,
        coursesUrl
      )
      const courses = (coursesResult.courses || []).slice(0, MAX_COURSES_PER_REQUEST)
      const coursework: Array<GoogleCoursework & { courseId: string; courseName: string }> = []

      // 並行リクエストをバッチ処理（メモリ使用量とAPI負荷の両方を制御）
      for (let i = 0; i < courses.length; i += MAX_CONCURRENT_REQUESTS) {
        const batch = courses.slice(i, i + MAX_CONCURRENT_REQUESTS)
        const results = await Promise.all(
          batch.map(async (course) => {
            const courseworkUrl = new URL(
              `https://classroom.googleapis.com/v1/courses/${encodeURIComponent(course.id)}/courseWork`
            )
            courseworkUrl.searchParams.set('courseWorkStates', 'PUBLISHED')
            courseworkUrl.searchParams.set('pageSize', '100')
            const result = await googleGet<{ courseWork?: GoogleCoursework[] }>(
              accessToken,
              courseworkUrl
            )
            return (result.courseWork || []).map((item) => ({
              ...item,
              courseId: course.id,
              courseName: course.name,
            }))
          })
        )
        coursework.push(...results.flat())
      }

      return {
        coursework: coursework.filter((item) =>
          createdThisAcademicYear(item.creationTime, academicYear.start, academicYear.end)
        ),
        academicYear: academicYear.label,
      }
    })
  },

  async calendarEvents(c: Context<Env>) {
    const academicYear = getAcademicYearRange()
    const timeMin = c.req.query('timeMin') || academicYear.start.toISOString()
    const timeMax = c.req.query('timeMax') || academicYear.end.toISOString()
    if (
      !Number.isFinite(Date.parse(timeMin)) ||
      !Number.isFinite(Date.parse(timeMax)) ||
      Date.parse(timeMax) <= Date.parse(timeMin)
    ) {
      return c.json({ error: 'カレンダーの取得期間が正しくありません。' }, 400)
    }

    return withGoogleData(c, async (accessToken) => {
      const events: GoogleCalendarEvent[] = []
      let pageToken: string | undefined
      do {
        const url = new URL(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events'
        )
        url.searchParams.set('timeMin', timeMin)
        url.searchParams.set('timeMax', timeMax)
        url.searchParams.set('singleEvents', 'true')
        url.searchParams.set('orderBy', 'startTime')
        url.searchParams.set('maxResults', '250')
        url.searchParams.set(
          'fields',
          'nextPageToken,items(id,summary,description,htmlLink,created,start,end,status)'
        )
        if (pageToken) url.searchParams.set('pageToken', pageToken)
        const result = await googleGet<{
          items?: GoogleCalendarEvent[]
          nextPageToken?: string
        }>(accessToken, url)
        events.push(...(result.items || []).filter((event) => event.status !== 'cancelled'))
        pageToken = result.nextPageToken
      } while (pageToken && events.length < 1000)

      return {
        events: events.filter((event) =>
          createdThisAcademicYear(event.created, academicYear.start, academicYear.end)
        ),
        academicYear: academicYear.label,
      }
    })
  },
}
