import { expect, test, beforeAll } from 'vitest'
import nock from 'nock'

import checkLinks from '../lib/index.js'

const aliveUrls = ['https://123.com/', 'http://456.com/', 'https://789.net/']

const aliveGETUrls = [
  'https://get-foo.com/',
  'https://get-bar.com/',
  'https://get-baz.net/'
]

const deadUrls = [
  'https://a.net/',
  'https://b.net/',
  'https://c.net/',
  'https://d.neti/',
  'https://e.net/',
  'https://f.net/',
  'https://g.net/',
  'https://h.net/',
  'https://i.net/'
]

const invalidUrls = ['ftp://123.com', 'mailto:foo@bar.com', 'foobar']

const allUrls = aliveUrls
  .concat(aliveGETUrls)
  .concat(deadUrls)
  .concat(invalidUrls)

beforeAll(() => {
  for (const url of aliveUrls) {
    nock(url).persist().intercept('/', 'HEAD').reply(200)
  }

  for (const url of aliveGETUrls) {
    nock(url)
      .persist()
      .intercept('/', 'HEAD')
      .reply(405)
      .intercept('/', 'GET')
      .reply(200)
  }

  for (const url of deadUrls) {
    nock(url)
      .persist()
      .intercept('/', 'HEAD')
      .reply(400)
      .intercept('/', 'GET')
      .reply(400)
      .intercept('/404', 'HEAD')
      .reply(404)
      .intercept('/404', 'GET')
      .reply(404)
      .intercept('/500', 'HEAD')
      .reply(500)
      .intercept('/500', 'GET')
      .reply(500)
  }
})

test('check-links alive urls HEAD', async () => {
  const results = await checkLinks(aliveUrls)
  expect(Object.keys(results).length).toBe(aliveUrls.length)

  for (const url in results) {
    expect(results[url]).toEqual({
      status: 'alive',
      statusCode: 200
    })
  }
})

test('check-links alive urls GET', async () => {
  const results = await checkLinks(aliveGETUrls)
  expect(Object.keys(results).length).toBe(aliveGETUrls.length)

  for (const url in results) {
    expect(results[url]).toEqual({
      status: 'alive',
      statusCode: 200
    })
  }
})

test('check-links invalid urls', async () => {
  const results = await checkLinks(invalidUrls)
  expect(Object.keys(results).length).toBe(invalidUrls.length)

  for (const url in results) {
    expect(results[url]).toEqual({
      status: 'invalid'
    })
  }
})

test(
  'check-links dead urls 500',
  {
    timeout: 30_000
  },
  async () => {
    const results = await checkLinks(deadUrls.map((url) => `${url}500`))
    expect(Object.keys(results).length).toBe(deadUrls.length)

    for (const url in results) {
      expect(results[url]).toEqual({
        status: 'dead',
        statusCode: 500
      })
    }
  }
)

test(
  'check-links dead urls 404',
  {
    timeout: 30_000
  },
  async () => {
    const results = await checkLinks(deadUrls.map((url) => `${url}404`))
    expect(Object.keys(results).length).toBe(deadUrls.length)

    for (const url in results) {
      expect(results[url]).toEqual({
        status: 'dead',
        statusCode: 404
      })
    }
  }
)

test('check-links mixed alive / dead / invalid urls', async () => {
  const results = await checkLinks(allUrls)
  expect(Object.keys(results).length).toBe(allUrls.length)

  for (const url of aliveUrls) {
    expect(results[url]).toEqual({
      status: 'alive',
      statusCode: 200
    })
  }

  for (const url of aliveGETUrls) {
    expect(results[url]).toEqual({
      status: 'alive',
      statusCode: 200
    })
  }

  for (const url of deadUrls) {
    expect(results[url]).toEqual({
      status: 'dead',
      statusCode: 400
    })
  }

  for (const url of invalidUrls) {
    expect(results[url]).toEqual({
      status: 'invalid'
    })
  }
})
