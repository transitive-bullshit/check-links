import got from 'got'
import http from 'http'
import https from 'https'
import { utils } from './utils.js'

export const agent = {
  http: new http.Agent({ rejectUnauthorized: false }),
  https: new https.Agent({ rejectUnauthorized: false })
}

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
export function checkLink(url, opts = {}) {
  const { headers = {}, ...rest } = opts

  opts = {
    headers: {
      'user-agent': utils.userAgent,
      'Upgrade-Insecure-Requests': 1,
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
      request: 30000
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
    got
      .head(
        url,
        Object.assign({}, opts, {
          retry: { limit: 0 }
        })
      )
      .then((res) => ({
        status: 'alive',
        statusCode: res.statusCode
      }))

  const fetchGET = () =>
    got(url, opts).then((res) => ({
      status: 'alive',
      statusCode: res.statusCode
    }))

  return fetchHEAD()
    .catch((err) => {
      console.warn('HEAD error', err)
      // TODO: if HEAD results in a `got.HTTPError`, are there status codes where
      // we can bypass the GET request?
      return fetchGET()
    })
    .catch((err) => {
      console.warn('GET error', err)
      return {
        status: 'dead',
        statusCode: err.statusCode
      }
    })
}
