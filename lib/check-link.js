'use strict'

const got = require('got')
const isRelativeUrl = require('is-relative-url')
const parse = require('url').parse

const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36'

const protocolWhitelist = new Set([
  'https:',
  'http:'
])

/**
 * Checks if a URL is alive (2XX status code).
 *
 * @name checkLink
 * @function
 *
 * @param {string} url - URL to test
 * @param {object} [opts] - Optional configuration options passed to got
 *
 * @return {Promise<LivenessResult>}
 */
module.exports = (url, opts) => {
  opts = opts || { }
  opts.headers = Object.assign({
    'user-agent': userAgent
  }, opts.headers)
  opts.timeout = opts.timeout || 10000

  if (!isValidUrl(url, opts)) {
    return Promise.resolve({
      status: 'invalid'
    })
  }

  // We only allow retrying the GET request because we don't want to wait on
  // exponential falloff for failed HEAD request and failed GET requests.
  const fetchHEAD = () => (
    got.head(url, Object.assign({ }, opts, {
      retry: { retries: 0 }
    }))
      .then((res) => ({
        status: 'alive',
        statusCode: res.statusCode
      }))
  )

  const fetchGET = () => (
    got(url, opts)
      .then((res) => ({
        status: 'alive',
        statusCode: res.statusCode
      }))
  )

  return fetchHEAD()
    .catch(() => {
      // TODO: if HEAD results in a `got.HTTPError`, are there status codes where
      // we can bypass the GET request?
      return fetchGET()
    })
    .catch((err) => ({
      status: 'dead',
      statusCode: err.statusCode
    }))
}

const isValidUrl = (url, opts) => {
  if (isRelativeUrl(url)) {
    return !!opts.baseUrl
  } else {
    const parsedUrl = parse(url)
    return protocolWhitelist.has(parsedUrl.protocol)
  }
}
