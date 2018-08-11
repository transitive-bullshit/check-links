'use strict'

const isRelativeUrl = require('is-relative-url')
const linkCheck = require('link-check')
const parse = require('url').parse
const pify = require('pify')
const pMap = require('p-map')
const pMemoize = require('p-memoize')
const pRetry = require('p-retry')

const pLinkCheck = pify(linkCheck)
const protocolWhitelist = new Set([
  'https:',
  'http:'
])

/**
 * Robustly checks an array of URLs for liveness.
 *
 * Returns a `Map<String, Object>` that maps each input URL to an Object with at least
 * one property, `status` which may be any of `alive | dead | error | invalid`. Status
 * will be `alive` if the URL was reachable, `dead` if it definitely was not reachable,
 * `error` in the event of repeated transport errors, and `invalid` if the URL was parsed
 * as invalid.
 *
 * Additionally, the result [LinkCheckResult](https://github.com/tcort/link-check/blob/master/lib/LinkCheckResult.js)
 * may contain a `statusCode` if the HTTP request to that URL resolved properly.
 *
 * @name checkLinks
 * @function
 *
 * @param {array<string>} urls - Array of urls to test
 * @param {object} [opts] - Configuration options
 * @param {string} [opts.baseUrl] - Base URL for resolving relative urls
 * @param {number} [opts.concurrency=8] - Maximum number of urls to resolve concurrently
 * @param {number} [opts.retries=2] - Number of times to retry resolving a dead URL
 * @param {Set} [opts.protocols=Set] - Set of string protocols to accept (defaults to `http:` and `https:`)
 *
 * @return {Promise}
 */
module.exports = (urls, opts) => {
  opts = opts || { }

  const baseUrl = opts.baseUrl
  const concurrency = opts.concurrency || 8
  const retries = opts.retries || 2
  const protocols = opts.protocols || protocolWhitelist
  const results = { }

  const validUrls = urls
    .filter((url) => isValidUrl(url, baseUrl, protocols))

  const invalidUrls = urls
    .filter((url) => !isValidUrl(url, baseUrl, protocols))

  invalidUrls.forEach((url) => {
    results[url] = { status: 'invalid' }
  })

  return (
    pMap(validUrls, (url) => {
      const u = isUrlAlive(url, {
        baseUrl,
        retries
      })

      if (!u.then) {
        console.log(url, u)
      }

      return u
        .then((result) => {
          results[url] = result
        })
    }, {
      concurrency
    })
      .then(() => results)
  )
}

const isValidUrl = (url, baseUrl, protocols) => {
  if (isRelativeUrl(url)) {
    return !!baseUrl
  } else {
    const parsedUrl = parse(url)
    return protocols.has(parsedUrl.protocol)
  }
}

const isUrlAlive = pMemoize((url, opts) => {
  const baseUrl = opts.baseUrl
  const retries = opts.retries

  return pRetry(() => (
    pLinkCheck(url, { baseUrl })
      .then((result) => {
        if (result.status !== 'alive') {
          if (result.statusCode >= 400 && result.statusCode < 500) {
            // retrying won't make a difference
            return result
          } else {
            const err = new Error(result.err || result.statusCode)
            err.result = result
            throw err
          }
        }

        return result
      })
  ), {
    retries
  })
    .catch((err) => {
      const result = err.result || { }
      result.status = result.status || 'error'
      return Promise.resolve(result)
    })
}, {
  maxAge: 60 * 1000
})
