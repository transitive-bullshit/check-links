import isRelativeUrl from 'is-relative-url'

export const protocolWhitelist = new Set(['https:', 'http:'])

export const userAgent =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36'

export function isValidUrl(url, opts) {
  if (isRelativeUrl(url)) {
    return !!opts.baseUrl
  } else {
    try {
      const parsedUrl = new URL(url)
      return protocolWhitelist.has(parsedUrl.protocol)
    } catch (err) {
      // invalid URL
      return false
    }
  }
}

// exporting utils in this way allows us to stub them in tests using `sinon`
export const utils = {
  isValidUrl,
  userAgent
}
