/**
 * @jest-environment jsdom
 */
import { TextEncoder } from 'util'
import { Crypto } from '@peculiar/webcrypto'
import { mockCodeToTokenFetch, setup } from './helper'
// global.crypto = new Crypto()
// global.TextEncoder = TextEncoder

const mockCacheGet = jest.fn().mockImplementation((key) => {})
const mockCacheRemove = jest.fn().mockImplementation((key) => {})
const mockCacheSet = jest.fn().mockImplementation((key) => {})

jest.mock('../../src/cache', () => {
  return {
    SessionStorageCache: jest.fn(() => {
      return { get: mockCacheGet, set: mockCacheSet, remove: mockCacheRemove }
    }),
    InmemCache: jest.fn(() => {
      return { get: mockCacheGet, set: mockCacheSet, remove: mockCacheRemove }
    }),
    LocalStorageCache: jest.fn(() => {
      return { get: mockCacheGet, set: mockCacheSet, remove: mockCacheRemove }
    }),
  }
})

describe('getAccessTokenSilently', () => {
  const cachedToken = {
    'myorg.com': {
      offline: [
        'crossid-spa-js|access_token|mysamples||offline__openid',
        'crossid-spa-js|id_token|mysamples||offline__openid',
        'crossid-spa-js|refresh_token|mysamples||offline__openid',
      ],
      openid: [
        'crossid-spa-js|access_token|mysamples||offline__openid',
        'crossid-spa-js|id_token|mysamples||offline__openid',
        'crossid-spa-js|refresh_token|mysamples||offline__openid',
      ],
    },
  }

  let mockFetch = jest.fn()
  let actualFetch

  beforeEach(async () => {
    mockFetch = await mockCodeToTokenFetch({
      nonce: 'dfafdsa',
      expiresIn: 1,
    })
    actualFetch = global.fetch
    global.fetch = mockFetch
  })

  afterEach(() => {
    mockCacheGet.mockClear()
    mockCacheSet.mockClear()
    mockCacheRemove.mockClear()
    mockFetch.mockClear()
    global.fetch = actualFetch
  })

  const cid = setup()
  it('should try to fetch token from cache', async () => {
    await cid.getTokenSilently()
    expect(mockCacheGet).toHaveBeenCalledTimes(5)
  })

  it('should try to fetch access token from cache with correct parameters', async () => {
    await cid.getTokenSilently()
    expect(mockCacheGet).toHaveBeenCalledWith('crossid-spa-js|index')
  })

  it('should return access token from cache if found', async () => {
    mockCacheGet.mockImplementationOnce((key) => cachedToken)
    mockCacheGet.mockImplementationOnce((key) => ({
      payload: { _raw: 'someAccessToken' },
    }))

    const token = await cid.getTokenSilently()

    expect(token).toBe('someAccessToken')
  })

  it('should not try to fetch access token from cache if ignore cache is specified', async () => {
    await cid.getTokenSilently({ ignoreCache: true })
    //Still accesses cache to fetch the refresh token and save the token after retrieval so still called several times
    expect(mockCacheGet).toHaveBeenCalledTimes(3)
  })

  it('should make a call to the token endpoint if no token found in cache', async () => {
    const token = await cid.getTokenSilently()

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('should make a call to the token endpoint with the correct parameters', async () => {
    mockCacheGet.mockImplementationOnce((key) => {})
    //The next call to the cache is to get the refresh token
    mockCacheGet.mockImplementationOnce((key) => cachedToken)
    mockCacheGet.mockImplementationOnce((key) => ({
      payload: { _raw: 'someRefreshToken' },
    }))
    const token = await cid.getTokenSilently()

    const expectFormData = {
      grant_type: 'refresh_token',
      refresh_token: 'someRefreshToken',
      audience: 'myorg.com',
      authorization_endpoint: 'https://myorg.crossid.io/oauth2/auth',
      client_id: 'client1',
      issuer: 'https://myorg.crossid.io/oauth2/',
      logout_endpoint: 'https://myorg.crossid.io/oauth2/logout',
      redirect_uri: 'https://localhost/callback',
      scope: 'openid',
      token_endpoint: 'https://myorg.crossid.io/oauth2/token',
    }

    const actualFetchOptions = mockFetch.mock.calls[0][1]
    const actualFetchBodyEntries = actualFetchOptions.body.entries()

    const actualFormData = Array.from(actualFetchBodyEntries).reduce(
      (acc: {}, f) => ({ ...acc, [f[0]]: f[1] }),
      {}
    )
    expect(actualFormData).toMatchObject(expectFormData)

    const tokenEndpointURL = mockFetch.mock.calls[0][0]
    expect(tokenEndpointURL).toBe('https://myorg.crossid.io/oauth2/token')
  })

  // todo test for different aud / scopes
  it('should get the access token from endpoint if not found in cache', async () => {
    mockCacheGet.mockImplementationOnce((key) => {})
    //The next call to the cache is to get the refresh token
    mockCacheGet.mockImplementationOnce((key) => cachedToken)
    mockCacheGet.mockImplementationOnce((key) => ({
      payload: { _raw: 'someRefreshToken' },
    }))

    const token = await cid.getTokenSilently()

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(token).toBeDefined()
  })

  it('should cache the token once it has been retrieved', async () => {
    mockCacheGet.mockImplementationOnce((key) => {})
    //The next call to the cache is to get the refresh token
    mockCacheGet.mockImplementationOnce((key) => cachedToken)
    mockCacheGet.mockImplementationOnce((key) => ({
      payload: { _raw: 'someRefreshToken' },
    }))

    const expectedAccessToken = {
      _raw: expect.any(String),
      aud: ['myorg.com'],
      exp: expect.any(Number),
      iat: expect.any(Number),
      iss: 'https://myorg.crossid.io/oauth2/',
      nbf: 1625484280,
      scp: ['openid'],
      sub: 'foo@bar.com',
    }

    const expectedIdToken = {
      aud: ['client1'],
      family_name: 'jared@example.com',
      given_name: 'Jared',
      name: 'Jared Dunn',
      exp: expect.any(Number),
      iat: expect.any(Number),
      iss: 'https://myorg.crossid.io/oauth2/',
      sub: 'foo@bar.com',
      __bearer: expect.any(String),
    }

    await cid.getTokenSilently()

    const cachedAccessTokenKey = mockCacheSet.mock.calls[0][0]
    const cachedAccessToken = mockCacheSet.mock.calls[0][1]

    expect(cachedAccessTokenKey).toEqual(
      'crossid-spa-js|access_token|client1|myorg.com|openid'
    )
    expect(cachedAccessToken.header).toStrictEqual({ alg: 'RS256', typ: 'JWT' })
    expect(cachedAccessToken.payload).toMatchObject(expectedAccessToken)

    const cachedIdTokenKey = mockCacheSet.mock.calls[2][0]
    const cachedIdToken = mockCacheSet.mock.calls[2][1]

    expect(cachedIdTokenKey).toEqual(
      'crossid-spa-js|id_token|client1|myorg.com|openid'
    )
    expect(cachedIdToken.header).toStrictEqual({ alg: 'RS256', typ: 'JWT' })
    expect(cachedIdToken.payload).toMatchObject(expectedIdToken)

    expect(mockCacheSet).toHaveBeenCalledWith('crossid-spa-js|index', {
      'myorg.com': {
        openid: ['crossid-spa-js|access_token|client1|myorg.com|openid'],
      },
    })
  })
})
