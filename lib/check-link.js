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
 * It first attempts an HTTP HEAD request, and if that fails it will attempt
 * an HTTP GET request, retrying several times by default with exponential falloff.
 *
 * Supports HTTP and HTTPS protocols.
 *
 * The resulting Promiise will resolve to a `LivenessResult` object
 * containing `status` and possibly `statusCode`.
 *
 * `LivenessResult.status` will be one of the following:
 * - `alive` if the URL is reachable (2XX status code)
 * - `dead` if the URL is not reachable
 * - `invalid` if the URL was parsed as invalid or used an unsupported protocol
 *
 * `LivenessResult.statusCode` will contain an integer HTTP status code if that URL resolved
 * properly.
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

  if (!isValidUrl(url, opts)) {
    return Promise.resolve({
      status: 'invalid'
    })
  }

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
      // TODO: if HEAD results in a `got.HTTPError`, check status code and bypass GET request
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
