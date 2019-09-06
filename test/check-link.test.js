'use strict'

const test = require('ava')
const sinon = require('sinon')

const checkLink = require('../lib/check-link')

test.serial('check-links default options', async (t) => {
  const stub = sinon.stub(checkLink, 'isValidUrl')
    .callsFake((url, opts) => {
      t.is(url, 'invalid')

      t.deepEqual(opts, {
        headers: {
          'user-agent': checkLink.userAgent,
          'Upgrade-Insecure-Requests': 1,
          'connection': 'keep-alive',
          'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'accept-encoding': 'gzip, deflate, br',
          'cache-control': 'max-age=0',
          'accept-language': 'en-US,en;q=0.9'
        },
        rejectUnauthorized: false,
        timeout: 30000
      })
    })

  await checkLink('invalid')

  stub.restore()
})

test.serial('check-links overriding got options', async (t) => {
  const stub = sinon.stub(checkLink, 'isValidUrl')
    .callsFake((url, opts) => {
      t.deepEqual(opts, {
        headers: {
          'user-agent': checkLink.userAgent,
          'Upgrade-Insecure-Requests': 1,
          'connection': 'keep-alive',
          'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'accept-encoding': 'gzip, deflate, br',
          'cache-control': 'max-age=0',
          'accept-language': 'en-US,en;q=0.9',
          'authorization': 'test'
        },
        rejectUnauthorized: false,
        timeout: 30000,
        retry: 3
      })
    })

  await checkLink('invalid', {
    headers: {
      'authorization': 'test'
    },
    retry: 3
  })

  stub.restore()
})
