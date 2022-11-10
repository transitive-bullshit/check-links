import test from 'ava'
import sinon from 'sinon'

import { checkLink, utils } from '../lib/index.js'

test.serial('check-links default options', async (t) => {
  const stub = sinon.stub(utils, 'isValidUrl').callsFake((url, opts) => {
    // @ts-expect-error options will always be passed here
    const { agent, ...rest } = opts

    t.is(url, 'invalid')

    t.deepEqual(rest, {
      headers: {
        'user-agent': utils.userAgent,
        'Upgrade-Insecure-Requests': '1',
        connection: 'keep-alive',
        accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'accept-encoding': 'gzip, deflate, br',
        'cache-control': 'max-age=0',
        'accept-language': 'en-US,en;q=0.9'
      },
      timeout: { request: 30000 }
    })

    return true
  })

  await checkLink('invalid')

  stub.restore()
})

test.serial('check-links overriding got options', async (t) => {
  const stub = sinon.stub(utils, 'isValidUrl').callsFake((url, opts) => {
    // @ts-expect-error options will always be passed here
    const { agent, ...rest } = opts

    t.deepEqual(rest, {
      headers: {
        'user-agent': utils.userAgent,
        'Upgrade-Insecure-Requests': '1',
        connection: 'keep-alive',
        accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'accept-encoding': 'gzip, deflate, br',
        'cache-control': 'max-age=0',
        'accept-language': 'en-US,en;q=0.9',
        authorization: 'test'
      },
      timeout: { request: 10000 },
      retry: { limit: 5 }
    })

    return true
  })

  await checkLink('invalid', {
    headers: {
      authorization: 'test'
    },
    timeout: { request: 10000 },
    retry: { limit: 5 }
  })

  stub.restore()
})
