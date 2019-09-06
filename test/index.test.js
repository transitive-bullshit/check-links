'use strict'

const test = require('ava')
const nock = require('nock')

const checkLinks = require('..')

const aliveUrls = [
  'https://123.com/',
  'http://456.com/',
  'https://789.net/'
]

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

const invalidUrls = [
  'ftp://123.com',
  'mailto:foo@bar.com',
  'foobar'
]

const allUrls = aliveUrls
  .concat(aliveGETUrls)
  .concat(deadUrls)
  .concat(invalidUrls)

test.before(() => {
  for (const url of aliveUrls) {
    nock(url)
      .persist()
      .intercept('/', 'HEAD')
      .reply(200)
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

test('check-links alive urls HEAD', async (t) => {
  const results = await checkLinks(aliveUrls)
  t.is(Object.keys(results).length, aliveUrls.length)

  for (const url in results) {
    t.deepEqual(results[url], {
      status: 'alive',
      statusCode: 200
    })
  }
})

test('check-links alive urls GET', async (t) => {
  const results = await checkLinks(aliveGETUrls)
  t.is(Object.keys(results).length, aliveGETUrls.length)

  for (const url in results) {
    t.deepEqual(results[url], {
      status: 'alive',
      statusCode: 200
    })
  }
})

test('check-links invalid urls', async (t) => {
  const results = await checkLinks(invalidUrls)
  t.is(Object.keys(results).length, invalidUrls.length)

  for (const url in results) {
    t.deepEqual(results[url], {
      status: 'invalid'
    })
  }
})

test('check-links dead urls 500', async (t) => {
  const results = await checkLinks(deadUrls.map((url) => `${url}500`))
  t.is(Object.keys(results).length, deadUrls.length)

  for (const url in results) {
    t.deepEqual(results[url], {
      status: 'dead',
      statusCode: 500
    })
  }
})

test('check-links dead urls 404', async (t) => {
  const results = await checkLinks(deadUrls.map((url) => `${url}404`))
  t.is(Object.keys(results).length, deadUrls.length)

  for (const url in results) {
    t.deepEqual(results[url], {
      status: 'dead',
      statusCode: 404
    })
  }
})

test('check-links mixed alive / dead / invalid urls', async (t) => {
  const results = await checkLinks(allUrls)
  t.is(Object.keys(results).length, allUrls.length)

  for (const url of aliveUrls) {
    t.deepEqual(results[url], {
      status: 'alive',
      statusCode: 200
    })
  }

  for (const url of aliveGETUrls) {
    t.deepEqual(results[url], {
      status: 'alive',
      statusCode: 200
    })
  }

  for (const url of deadUrls) {
    t.deepEqual(results[url], {
      status: 'dead',
      statusCode: 400
    })
  }

  for (const url of invalidUrls) {
    t.deepEqual(results[url], {
      status: 'invalid'
    })
  }
})
