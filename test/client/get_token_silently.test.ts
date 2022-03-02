/**
 * @jest-environment jsdom
 */
import { TextEncoder } from 'util'
import { Crypto } from '@peculiar/webcrypto'
import { mockCodeToTokenFetch, setup } from './helper'
global.crypto = new Crypto()
global.TextEncoder = TextEncoder

const mockCacheGet = jest.fn()

jest.mock('../../src/cache', () => {
  return {
    SessionStorageCache: jest.fn(() => {
      return { get: mockCacheGet }
    }),
    InmemCache: jest.fn(() => {
      return { get: mockCacheGet }
    }),
    LocalStorageCache: jest.fn(() => {
      return { get: mockCacheGet }
    }),
  }
})

describe('getAccessTokenSilently', () => {
  beforeEach(() => {
    mockCacheGet.mockClear()
  })

  const cid = setup()
  it('should try to fetch token from cache', async () => {
    await cid.getTokenSilently()
    expect(mockCacheGet).toHaveBeenCalledTimes(2)
  })

  it('should try to fetch access token from cache with correct parameters', async () => {
    await cid.getTokenSilently()
    expect(mockCacheGet).toHaveBeenCalledWith('crossid-spa-js|index')
  })

  it('should return access token from cache if found', async () => {
    mockCacheGet.mockImplementationOnce((key) => 'someAccessToken')

    const token = await cid.getTokenSilently()

    expect(token).toBe('someAccessToken')
  })

  it('should not try to fetch access token from cache if ignore cache is specified', async () => {
    await cid.getTokenSilently({ ignoreCache: true })
    //Still accesses cache to fetch the refresh token so verify only called once
    expect(mockCacheGet).toHaveBeenCalledTimes(1)
  })

  it('should make a call to the token endpoint', async () => {
    const mockCode = await mockCodeToTokenFetch({
      nonce: 'dfafdsa',
      expiresIn: 1,
    })
    global.fetch = mockCode

    const token = await cid.getTokenSilently()

    expect(mockCode).toHaveBeenCalledTimes(1)
  })

  it('should make a call to the token endpoint with the correct parameters', async () => {
    const mockCode = await mockCodeToTokenFetch({
      nonce: 'dfafdsa',
      expiresIn: 1,
    })
    global.fetch = mockCode
    mockCacheGet.mockImplementationOnce((key) => 'someRefreshToken')

    const token = await cid.getTokenSilently()

    expect(mockCode).toHaveBeenCalledWith(
      'https://myorg.crossid.io/oauth2/token',
      { body: {}, method: 'POST', signal: {}, timeout: undefined }
    )
  })

  it('should make a call to the token endpoint with the correct parameters', async () => {
    const mockCode = await mockCodeToTokenFetch({
      nonce: 'dfafdsa',
      expiresIn: 1,
    })

    global.fetch = mockCode

    const token = await cid.getTokenSilently()

    expect(mockCode).toHaveBeenCalledWith(
      'https://myorg.crossid.io/oauth2/token',
      { body: {}, method: 'POST', signal: {}, timeout: undefined }
    )
  })

  it('should get access token', async () => {
    let nonce
    const res = await cid.createRedirectURL({ state: 'foo' })
    const authCodeUrl = new URL(res)
    nonce = authCodeUrl.searchParams.get('nonce')
    const url = new URL('https://myapp')
    url.searchParams.append('code', 'mocked-code')
    global.fetch = await mockCodeToTokenFetch({ nonce, expiresIn: 1 })
    await cid.handleRedirectCallback(url)
    expect(await cid.getAccessToken()).toBeDefined()
    await new Promise((res) => setTimeout(res, 1100))
    // expired
    expect(await cid.getAccessToken()).toBeUndefined()
  })

  // todo test for different aud / scopes
  it('should get the access token if not found in cache', async () => {
    let nonce
    // const res = await cid.createRedirectURL({ state: 'foo' })
    // const authCodeUrl = new URL(res)
    // nonce = authCodeUrl.searchParams.get('nonce')
    // const url = new URL('https://myapp')
    // url.searchParams.append('code', 'mocked-code')
    const mockCode = await mockCodeToTokenFetch({ nonce, expiresIn: 1 })

    global.fetch = mockCode

    // await cid.handleRedirectCallback(url)
    // const u = await cid.getUser()

    // expect(u).toHaveProperty('family_name', 'jared@example.com')
    // expect(u[BEARER_CLAIM]).toBeDefined()

    await new Promise((res) => setTimeout(res, 1100))
    // expired
    const token = await cid.getTokenSilently()

    expect(mockCode).toHaveBeenCalledTimes(1)
    expect(token).toBeDefined()
  })
})
