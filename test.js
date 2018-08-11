'use strict'

const { test } = require('ava')
const nock = require('nock')

const checkLinks = require('.')

test.serial('check-links all alive', async (t) => {
  const urls = [
    'https://NzcxNjJkYzliY2RiMmQ4OTBiNWE1ZmRl.com',
    'http://ZjFiN2UyMThmODUzZWQ5ZmJmODM2YmFm.com',
    'https://ODdjY2I3YWJlZDdmYmQ4Zjc1ZTI4MjQ3.net'
  ]

  for (const url of urls) {
    nock(url).intercept('/', 'GET').reply(200)
  }

  const results = await checkLinks(urls)
  t.is(Object.keys(results).length, urls.length)

  for (const url in results) {
    const result = results[url]
    t.is(result.status, 'alive')
    t.is(result.statusCode, 200)
  }

  nock.cleanAll()
})

test.serial('check-links all dead and retry properly', async (t) => {
  const urls = [
    'https://Nzcx.com',
    'http://ZjFiN2Uy.com',
    'https://ODdjY2I3.net'
  ]

  for (const url of urls) {
    nock(url).intercept('/', 'GET').times(3).reply(500)
  }

  const results = await checkLinks(urls)
  t.is(Object.keys(results).length, urls.length)

  for (const url in results) {
    const result = results[url]
    t.is(result.status, 'dead')
    t.is(result.statusCode, 500)
  }

  nock.cleanAll()
})

test.serial('check-links mixed alive / dead', async (t) => {
  const aliveUrls = [
    'https://123.com',
    'http://456.com',
    'https://789.net'
  ]

  const deadUrls = [
    'https://a.net',
    'https://b.net',
    'https://c.net',
    'https://d.net',
    'https://e.net',
    'https://f.net',
    'https://g.net',
    'https://h.net',
    'https://i.net'
  ]

  const urls = aliveUrls.concat(deadUrls)

  for (const url of aliveUrls) {
    nock(url).intercept('/', 'GET').reply(200)
  }

  for (const url of deadUrls) {
    nock(url).intercept('/', 'GET').reply(404)
  }

  const results = await checkLinks(urls)
  t.is(Object.keys(results).length, urls.length)

  for (const url of aliveUrls) {
    const result = results[url]
    t.is(result.status, 'alive')
    t.is(result.statusCode, 200)
  }

  for (const url of deadUrls) {
    const result = results[url]
    t.is(result.status, 'dead')
    t.is(result.statusCode, 404)
  }

  nock.cleanAll()
})

test.serial('check-links mixed alive / dead - 1 retry', async (t) => {
  const aliveUrls = [
    'https://123.com',
    'http://456.com',
    'https://789.net'
  ]

  const deadUrls = [
    'https://a.net',
    'https://b.net',
    'https://c.net',
    'https://d.net',
    'https://e.net',
    'https://f.net',
    'https://g.net',
    'https://h.net',
    'https://i.net'
  ]

  const urls = aliveUrls.concat(deadUrls)

  for (const url of aliveUrls) {
    nock(url).intercept('/', 'GET').reply(200)
  }

  for (const url of deadUrls) {
    nock(url).intercept('/', 'GET').times(2).reply(502)
  }

  const results = await checkLinks(urls, {
    retries: 1
  })
  t.is(Object.keys(results).length, urls.length)

  for (const url of aliveUrls) {
    const result = results[url]
    t.is(result.status, 'alive')
    t.is(result.statusCode, 200)
  }

  for (const url of deadUrls) {
    const result = results[url]
    t.is(result.status, 'dead')
    t.is(result.statusCode, 502)
  }

  nock.cleanAll()
})
