import got from 'got'
import http from 'node:http'
import https from 'node:https'
import { utils } from './utils.js'

export const agent = {
  http: new http.Agent(),
  https: new https.Agent({ rejectUnauthorized: false })
}

/**
 * @typedef {import('got').HTTPError} HTTPError
 * @typedef {import('got').Response} Response
 *
 * @typedef {object} LivenessResult
 * @property {'invalid' | 'alive' | 'dead'} status
 * @property {number} [statusCode]
 */

/**
 * Checks if a URL is alive (2XX status code).
 *
 * @name checkLink
 * @function
 *
 * @param {string} url - URL to test
 * @param {import('got').OptionsOfTextResponseBody} [opts] - Optional configuration options passed to got
 *
 * @return {Promise<LivenessResult>}
 */
export function checkLink(url, opts = {}) {
  const { headers = {}, ...rest } = opts

  opts = {
    headers: {
      'user-agent': utils.userAgent,
      'Upgrade-Insecure-Requests': '1',
      connection: 'keep-alive',
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'accept-encoding': 'gzip, deflate, br',
      'cache-control': 'max-age=0',
      'accept-language': 'en-US,en;q=0.9',
      ...headers
    },
    agent,
    timeout: {
      request: 30_000
    },
    ...rest
  }

  if (!utils.isValidUrl(url, opts)) {
    return Promise.resolve({
      status: 'invalid'
    })
  }

  // We only allow retrying the GET request because we don't want to wait on
  // exponential falloff for failed HEAD request and failed GET requests.
  const fetchHEAD = () =>
    got.head(url, { ...opts, retry: { limit: 0 } }).then(
      (res) =>
        /** @type {const} */ ({
          status: 'alive',
          statusCode: res.statusCode
        })
    )

  const fetchGET = () =>
    got(url, opts).then(
      (res) =>
        /** @type {const} */ ({
          status: 'alive',
          statusCode: res.statusCode
        })
    )

  return fetchHEAD()
    .catch((/** @type {HTTPError} */ err) => {
      // TODO: if HEAD results in a `got.HTTPError`, are there status codes where
      // we can bypass the GET request?
      return fetchGET()
    })
    .catch((/** @type {Response} */ err) => {
      return /** @type {const} */ ({
        status: 'dead',
        statusCode: err.statusCode ?? err.response?.statusCode
      })
    })
}
