// Client-side analytics tracking
// Privacy-friendly, GDPR-compliant analytics without cookies

// Generate or retrieve session ID (stored in sessionStorage, not cookies)
function getSessionId(): string {
  if (typeof window === 'undefined') return ''

  let sessionId = sessionStorage.getItem('ekaty_session_id')
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem('ekaty_session_id', sessionId)
  }
  return sessionId
}

// Detect device type
function getDeviceType(): string {
  if (typeof window === 'undefined') return 'unknown'

  const width = window.innerWidth
  if (width < 768) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

// Get browser info
function getBrowserInfo() {
  if (typeof window === 'undefined') return { browser: 'unknown', os: 'unknown' }

  const ua = navigator.userAgent
  let browser = 'Unknown'
  let os = 'Unknown'

  // Detect browser
  if (ua.indexOf('Chrome') > -1) browser = 'Chrome'
  else if (ua.indexOf('Safari') > -1) browser = 'Safari'
  else if (ua.indexOf('Firefox') > -1) browser = 'Firefox'
  else if (ua.indexOf('Edge') > -1) browser = 'Edge'

  // Detect OS
  if (ua.indexOf('Win') > -1) os = 'Windows'
  else if (ua.indexOf('Mac') > -1) os = 'macOS'
  else if (ua.indexOf('Linux') > -1) os = 'Linux'
  else if (ua.indexOf('Android') > -1) os = 'Android'
  else if (ua.indexOf('iOS') > -1) os = 'iOS'

  return { browser, os }
}

// Extract UTM parameters from URL
function getUTMParams() {
  if (typeof window === 'undefined') return {}

  const params = new URLSearchParams(window.location.search)
  return {
    utmSource: params.get('utm_source') || undefined,
    utmMedium: params.get('utm_medium') || undefined,
    utmCampaign: params.get('utm_campaign') || undefined,
  }
}

// Track event (primary tracking function)
export async function trackEvent({
  eventType,
  eventCategory,
  eventAction,
  eventLabel,
  eventValue,
  restaurantId,
  metadata,
}: {
  eventType: string
  eventCategory: string
  eventAction: string
  eventLabel?: string
  eventValue?: number
  restaurantId?: string
  metadata?: Record<string, any>
}) {
  if (typeof window === 'undefined') return

  try {
    const { browser, os } = getBrowserInfo()

    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: getSessionId(),
        eventType,
        eventCategory,
        eventAction,
        eventLabel,
        eventValue,
        page: window.location.pathname,
        referrer: document.referrer || undefined,
        restaurantId,
        deviceType: getDeviceType(),
        browser,
        os,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      }),
    })
  } catch (error) {
    // Silently fail - don't break user experience
    console.error('Analytics tracking error:', error)
  }
}

// Track page view
export function trackPageView(page?: string) {
  trackEvent({
    eventType: 'page_view',
    eventCategory: 'navigation',
    eventAction: 'view',
    eventLabel: page || window.location.pathname,
  })
}

// Track button click
export function trackClick(label: string, category: string = 'engagement') {
  trackEvent({
    eventType: 'click',
    eventCategory: category,
    eventAction: 'click',
    eventLabel: label,
  })
}

// Track launch campaign events
export function trackLaunchEvent(action: string, label?: string, value?: number) {
  trackEvent({
    eventType: 'launch_campaign',
    eventCategory: 'launch',
    eventAction: action,
    eventLabel: label,
    eventValue: value,
  })
}

// Track restaurant interaction
export function trackRestaurantEvent(
  action: string,
  restaurantId: string,
  label?: string
) {
  trackEvent({
    eventType: 'restaurant_interaction',
    eventCategory: 'restaurant',
    eventAction: action,
    eventLabel: label,
    restaurantId,
  })
}

// Track form submission
export function trackFormSubmit(formName: string, success: boolean) {
  trackEvent({
    eventType: 'form_submit',
    eventCategory: 'conversion',
    eventAction: success ? 'submit_success' : 'submit_error',
    eventLabel: formName,
  })
}

// Track search
export function trackSearch(query: string, resultsCount: number) {
  trackEvent({
    eventType: 'search',
    eventCategory: 'discovery',
    eventAction: 'search',
    eventLabel: query,
    eventValue: resultsCount,
  })
}

// Track an Ask eKaty request: what was asked, how it parsed, how many picks
// came back. `source` distinguishes the homepage hand-off from the /ask page.
export function trackAskQuery({
  query,
  source,
  resultCount,
  schema,
}: {
  query: string
  source: 'home' | 'ask' | 'spinner'
  resultCount: number
  schema?: Record<string, any>
}) {
  trackEvent({
    eventType: 'ask',
    eventCategory: 'ask',
    eventAction: 'query',
    eventLabel: query,
    eventValue: resultCount,
    metadata: { source, schema },
  })
}

// Track a click through from an Ask eKaty pick to the restaurant listing.
export function trackAskPickClick({
  restaurantId,
  restaurantName,
  position,
  source,
  query,
}: {
  restaurantId: string
  restaurantName: string
  position: number
  source: 'home' | 'ask' | 'spinner'
  query: string
}) {
  trackEvent({
    eventType: 'ask',
    eventCategory: 'ask',
    eventAction: 'pick_click',
    eventLabel: restaurantName,
    eventValue: position,
    restaurantId,
    metadata: { source, query, position },
  })
}

// Track a hand-off from Ask eKaty picks into Grub Roulette.
export function trackAskSpinSimilar({
  source,
  cuisine,
}: {
  source: 'home' | 'ask' | 'spinner'
  cuisine?: string
}) {
  trackEvent({
    eventType: 'ask',
    eventCategory: 'ask',
    eventAction: 'spin_similar',
    eventLabel: cuisine,
    metadata: { source, cuisine },
  })
}

// Initialize session tracking
export async function initializeSession() {
  if (typeof window === 'undefined') return

  const sessionId = getSessionId()
  const { browser, os } = getBrowserInfo()
  const utmParams = getUTMParams()

  try {
    await fetch('/api/analytics/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        landingPage: window.location.pathname,
        referrer: document.referrer || undefined,
        referrerDomain: document.referrer ? new URL(document.referrer).hostname : undefined,
        deviceType: getDeviceType(),
        browser,
        os,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        ...utmParams,
      }),
    })
  } catch (error) {
    console.error('Session initialization error:', error)
  }
}

// Track Core Web Vitals
export function trackWebVitals(metric: {
  name: string
  value: number
  rating?: string
}) {
  if (typeof window === 'undefined') return

  const vitalsMap: Record<string, string> = {
    FCP: 'fcp',
    LCP: 'lcp',
    FID: 'fid',
    CLS: 'cls',
    TTFB: 'ttfb',
  }

  const vitalName = vitalsMap[metric.name]
  if (!vitalName) return

  fetch('/api/analytics/performance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      page: window.location.pathname,
      [vitalName]: metric.value,
      deviceType: getDeviceType(),
      browser: getBrowserInfo().browser,
    }),
  }).catch(console.error)
}

// Track conversion funnel step
export async function trackFunnelStep({
  funnelType,
  step,
  restaurantId,
  metadata,
}: {
  funnelType: string
  step: 1 | 2 | 3 | 4
  restaurantId?: string
  metadata?: Record<string, any>
}) {
  try {
    await fetch('/api/analytics/funnel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: getSessionId(),
        funnelType,
        step,
        restaurantId,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      }),
    })
  } catch (error) {
    console.error('Funnel tracking error:', error)
  }
}

// Convenience functions for specific funnels
export const funnels = {
  giveaway: {
    view: () => trackFunnelStep({ funnelType: 'giveaway', step: 1 }),
    modalOpen: () => trackFunnelStep({ funnelType: 'giveaway', step: 2 }),
    formStart: () => trackFunnelStep({ funnelType: 'giveaway', step: 3 }),
    submit: () => trackFunnelStep({ funnelType: 'giveaway', step: 4 }),
  },
  coupon: {
    view: () => trackFunnelStep({ funnelType: 'coupon', step: 1 }),
    modalOpen: () => trackFunnelStep({ funnelType: 'coupon', step: 2 }),
    codeView: () => trackFunnelStep({ funnelType: 'coupon', step: 3 }),
    redeem: () => trackFunnelStep({ funnelType: 'coupon', step: 4 }),
  },
  flyer: {
    view: () => trackFunnelStep({ funnelType: 'flyer', step: 1 }),
    modalOpen: () => trackFunnelStep({ funnelType: 'flyer', step: 2 }),
    select: () => trackFunnelStep({ funnelType: 'flyer', step: 3 }),
    download: () => trackFunnelStep({ funnelType: 'flyer', step: 4 }),
  },
  spin: {
    view: () => trackFunnelStep({ funnelType: 'spin', step: 1 }),
    filterSet: () => trackFunnelStep({ funnelType: 'spin', step: 2 }),
    spin: (restaurantId: string) => trackFunnelStep({ funnelType: 'spin', step: 3, restaurantId }),
    visit: (restaurantId: string) => trackFunnelStep({ funnelType: 'spin', step: 4, restaurantId }),
  },
}
