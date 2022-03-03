/**
 * @jest-environment jsdom
 */
import { TextEncoder } from 'util'
import { Crypto } from '@peculiar/webcrypto'
import { mockCodeToTokenFetch, setup } from './helper'
global.crypto = new Crypto()
global.TextEncoder = TextEncoder

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
  const decodedToken = {
    access_token:
      'eyJhbGciOiJSUzI1NiIsImtpZCI6InB1YmxpYzo5NzhiOWM4My00M2Y4LTQxNGEtOTU1YS1iZjJiNGVmYjUyNDMiLCJ0eXAiOiJKV1QifQ.eyJhdWQiOltdLCJjbGllbnRfaWQiOiJteXNhbXBsZXMiLCJleHAiOjE2NDYzMDYzMTksImV4dCI6e30sImlhdCI6MTY0NjMwMjcxOCwiaXNzIjoiaHR0cDovLzEyNy4wLjAuMTo0NDQ0LyIsImp0aSI6Ijg3ZTU3YzU3LTlmOWQtNDZkMC05OWY5LTUzNDBmYTdlNThhOCIsIm5iZiI6MTY0NjMwMjcxOCwic2NwIjpbIm9wZW5pZCIsIm9mZmxpbmUiXSwic3ViIjoiZGMyMzc1YjAtYzljNC00NzM5LWJmNmEtZWEwYjc2ODYyMDVmIn0.SZEbb6-0-2Znov8LXKELtnSCVg5P73u9BuFDBf6XLNlHGxzvAinrIE7mCAhXEB9Jo-6AxcGl1xuhax7PqOBuuAbCWaXqBFFV5z0pjxrMh3a7Flb043Y21Q1cp6dara0PA5cQOH7b4KJ2qpa7q_eH3hgVib6e1pbgWPTUHjh_ezpn87oAdgPvotqe7am58IZRWf7YQPD0q7RFkkNhto4frUAp5JipmiMvDHAN50gcqPn7bWzWAFC7cN4WWXPHcSF80N3qGHMzyMfWJjzoIPBKbOdF7n5Xlez5hRJG0MTno1oH8Z5P3khIqkpoipE1Mr7X1GLgl6C0Jae8b8sZHcmNg8EIMEAqXYJv8JzkXEQXNNmPrORyh8Ilh76_H61oTcgS4KJN8XqqPDizG49P75Y7y0rDZJzSvGoqFmxXV_qzSyVl23IVDaWqN196P1ES4l36rCySMAi14FQI5Za69Lqt_ro-0_j3BmM38wN3oJdSjD1iH4bFVHEkvd7m0ychh-atFB1EhmZTqIcY7FW8py9FAULf543TF8dMHrZB9I5lBsNP_Oc-H7vzZR38LU-AKZy6eIqtx2C9ONj0XrXx9dULqwkZ-t1IRplxfc6L5jxGZgxyli2fMGWyZblEYVhQBCjBUoMOgk7LP2TbBxTDCP41ilU5bK4YbyFTspDxu3gbRfc',
    expires_in: 3600,
    id_token:
      'eyJhbGciOiJSUzI1NiIsImtpZCI6InB1YmxpYzo2YmU4ZjNjYy04NjBmLTQwOTEtOWEzNS0zYTgwZmI1OWY3YWMiLCJ0eXAiOiJKV1QifQ.eyJhdF9oYXNoIjoiLTNZanA5U01BX0E4UTdYVklTeXQ4ZyIsImF1ZCI6WyJteXNhbXBsZXMiXSwiYXV0aF90aW1lIjoxNjQ2MzAyNzA2LCJleHAiOjE2NDYzMDYzMTgsImlhdCI6MTY0NjMwMjcxOCwiaXNzIjoiaHR0cDovLzEyNy4wLjAuMTo0NDQ0LyIsImp0aSI6ImJhYTZkODI5LTlmNTEtNGRmYy1iNjQ4LTQ4MjlhZjZlZjRiOCIsIm5vbmNlIjoiUzJ4bVNVOXZhVk5QTW5oeFNGbHhNRzVGZVVRME5FTlNlbGt0WHpSa1JtWmhjSEJ3YUU1TFUwMVFZamhtV0hGTk0xbFpOMmRYUVZsaWNGZFJZMnB6UmpGYWRqUmpjbE4wU2twR1RqbE1NbDl4Y2pWT2NHNVpTV3R1V0ZOSGMzcExRblJXVUMxWlpFNVZkVzR6Tm1SdlowTnNSWFEiLCJyYXQiOjE2NDYzMDI2NzYsInNpZCI6ImVhMGU4ZmQ5LTlmOGEtNDY0YS05ZDAxLTdiZTI4NzMwNWM3NiIsInN1YiI6ImRjMjM3NWIwLWM5YzQtNDczOS1iZjZhLWVhMGI3Njg2MjA1ZiJ9.AoNboW1eQh6krMLprJCoTRG2O9lZmY0LSVmCqFTwiB--lM-M5tc-KFXo5yIFS1ylZ71bVjCVmTAiuY1QNUPTtbpV3Ijx0qnPoE-Oq5yQsN0dTjlbAAhDDtnIKt_7Mhnkj3iIBV62EPsqxOkdJ1nQCcW8VE113NiEqui4DSXC83cJdrUF-sAmxpDzpjDDTgReiv6kSyqXuPI4nWXKMPwcq4Kz7WjGyiGO33a3CB7NrppjMm9eFX6LjY66XV5yVBScu5EfcJxmEBlO0ePtHX7aUBL8ClTbll09CAGAIXkR7_4OT_fkswvcK3LgyyPx8bYNZOl2S4o6yX20owlvvZB-ubil4MY80D7Oj5voTERBFF_CzD6inRjyJE-w3VQtXa0jzQfkKW-LK0gMMeUBQbXVq7oJ2PScYRrCUcF_15xTCTDOaOxhOUNy0DD_x0M9BjpymRPqvmQetRucojtapQUvNgEh_mNjMXXXveLo-CKgbtx-wpZfyd9wuSXB6eHyiK9ScjLpvhYLY64i7lrY3xeIvdz-wO60bhK6glZg0PcIgpFiNyOt1_-Vu2rgt2aDECXQsvz_H9W1yZc5jJEEU8fykU7KFIiL3LXUDq56PwtdaB4Ds4R9TIQXErZl-FGovK83oNaDCLdKKG275jNKCH0ZgKgcF0SGJlmlgsQbtghiik8',
    refresh_token:
      '9VaAP18WsvGEfJJmFg8ZR7nN37wo0BIARtpBFKno_wc.e00l-7sTyyKWc1M655pSRi7rGqnisuLBL5FGzjw7MEU',
    scope: 'openid offline',
    token_type: 'bearer',
  }

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
    mockCacheGet.mockImplementationOnce((key) => cachedToken)
    mockCacheGet.mockImplementationOnce((key) => ({
      payload: { _raw: 'someAccessToken' },
    }))

    const token = await cid.getTokenSilently()

    expect(token).toBe('someAccessToken')
  })

  it('should not try to fetch access token from cache if ignore cache is specified', async () => {
    await cid.getTokenSilently({ ignoreCache: true })
    //Still accesses cache to fetch the refresh token so verify only called once
    expect(mockCacheGet).toHaveBeenCalledTimes(1)
  })

  it('should make a call to the token endpoint if no token found in cache', async () => {
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

    const tokenOptions = {
      grant_type: 'refresh_token',
      refresh_token: 'someRefreshToken',
    }
    let formData = new FormData()
    Object.keys(tokenOptions).forEach((k) =>
      formData.append(k, tokenOptions[k])
    )

    const controller = new AbortController()

    expect(mockCode).toHaveBeenCalledWith(
      'https://myorg.crossid.io/oauth2/token',
      {
        body: formData,
        method: 'POST',
        signal: controller.signal,
        timeout: undefined,
      }
    )
  })

  // todo test for different aud / scopes
  it('should get the access token from endpoint if not found in cache', async () => {
    mockCacheGet.mockImplementationOnce((key) => {})
    //The next call to the cache is to get the refresh token
    mockCacheGet.mockImplementationOnce((key) => cachedToken)
    mockCacheGet.mockImplementationOnce((key) => ({
      payload: { _raw: 'someRefreshToken' },
    }))

    const mockCode = await mockCodeToTokenFetch({ nonce: 'somenonce' })

    global.fetch = mockCode

    const token = await cid.getTokenSilently()

    expect(mockCode).toHaveBeenCalledTimes(1)
    expect(token).toBeDefined()
  })

  it('should make a call to the token endpoint with the correct parameters', async () => {
    mockCacheGet.mockImplementationOnce((key) => {})
    //The next call to the cache is to get the refresh token
    mockCacheGet.mockImplementationOnce((key) => cachedToken)
    mockCacheGet.mockImplementationOnce((key) => ({
      payload: { _raw: 'someRefreshToken' },
    }))

    const mockCode = await mockCodeToTokenFetch({ nonce: 'somenonce' })

    global.fetch = mockCode

    await cid.getTokenSilently()

    expect(mockCode).toHaveBeenCalledWith(
      'https://myorg.crossid.io/oauth2/token',

      { body: {}, method: 'POST', signal: {}, timeout: undefined }
    )
  })

  it('should cache the token once it has been retrieved', async () => {
    mockCacheGet.mockImplementationOnce((key) => {})
    //The next call to the cache is to get the refresh token
    mockCacheGet.mockImplementationOnce((key) => cachedToken)
    mockCacheGet.mockImplementationOnce((key) => ({
      payload: { _raw: 'someRefreshToken' },
    }))

    const mockCode = await mockCodeToTokenFetch({ nonce: 'somenonce' })

    global.fetch = mockCode

    await cid.getTokenSilently()

    expect(mockCacheSet).toHaveBeenCalledWith(
      'crossid-spa-js|access_token|client1|myorg.com|openid',
      {
        header: { alg: 'RS256', typ: 'JWT' },
        payload: {
          _raw: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL215b3JnLmNyb3NzaWQuaW8vb2F1dGgyLyIsImF1ZCI6WyJteW9yZy5jb20iXSwibmJmIjoxNjI1NDg0MjgwLCJzdWIiOiJmb29AYmFyLmNvbSIsInNjcCI6WyJvcGVuaWQiXSwiaWF0IjoxNjQ2MzE0NzYxLCJleHAiOjE2NDYzMTgzNjF9.betpM_ryJ5dpIvhfhqOXY_F_-FKQOALIyu0tsN7fEkYGV4owXwbkSg6dICNLx_xKAu0zOgUMS-SAmIAVbBEGjI1-kinKuT2IoKXnRmDs6wQwhbwJVHOPyJWxiPp_u9PY2-XRBW0rqq4pEQE8umGAylO7HrUm2fTU9PGOV-zy648K4YFZuKA2TZzq4YBTZbAg3TXwTdzQLU26QLYCFIZ8Z57ndJBRuMBs9Ih6EYZuAT1mnrt2qwa0_zkhrO11q2U6upo2p8vHx4fb3DD9Rk5Z0Ilw_9pKPf8fLflaCJX3092-q9BkgwvHvmqJ3y7ZXVCpEf8sN2OvlqMjtumCqX15tw',
          aud: ['myorg.com'],
          exp: 1646318361,
          iat: 1646314761,
          iss: 'https://myorg.crossid.io/oauth2/',
          nbf: 1625484280,
          scp: ['openid'],
          sub: 'foo@bar.com',
        },
      },
      { ttl: 3599.045 }
    )

    expect(mockCacheSet).toHaveBeenCalledWith('crossid-spa-js|index', {
      'myorg.com': {
        openid: ['crossid-spa-js|access_token|client1|myorg.com|openid'],
      },
    })

    expect(mockCacheSet).toHaveBeenCalledWith(
      'crossid-spa-js|id_token|client1|myorg.com|openid',
      {
        header: { alg: 'RS256', typ: 'JWT' },
        payload: {
          __bearer:
            'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL215b3JnLmNyb3NzaWQuaW8vb2F1dGgyLyIsImF1ZCI6WyJjbGllbnQxIl0sInN1YiI6ImZvb0BiYXIuY29tIiwibmFtZSI6IkphcmVkIER1bm4iLCJnaXZlbl9uYW1lIjoiSmFyZWQiLCJmYW1pbHlfbmFtZSI6ImphcmVkQGV4YW1wbGUuY29tIiwibm9uY2UiOiJzb21lbm9uY2UiLCJpYXQiOjE2NDYzMTQ3NjEsImV4cCI6MTY0NjMxODM2MX0.kyng7kwUP5zTpSDAB-Yk6Cubzz-6oBFF-XaXmu1DAkKP2waclb4qgFdnov62h0FucWSKRb_70xssCtEeMu6bpAV6kog35CUd1uDQvtJHpODHNnn6p1BOC5PH6Oatv5S80b3ZuKdsXlxQ2kTlF9xPiVWFjRhDglrxrgdAqjZwoyGpGCfWHGlzYfwue_4wnOK2n-uN7_VkoXZWT4y2DD7ezw2aaoUSPgFckh0RWuiMe0WfWLUkXRJz88gus6QqqIa_2itv8zODOd2Jmx1rhMfie2rwkczBzTz259uDm5ezpUgaUf43AvDdVJiBEzp4JTwas8DEGnp7JGjcSwN1nvStiA',
          aud: ['client1'],
          exp: 1646318361,
          family_name: 'jared@example.com',
          given_name: 'Jared',
          iat: 1646314761,
          iss: 'https://myorg.crossid.io/oauth2/',
          name: 'Jared Dunn',
          nonce: 'somenonce',
          sub: 'foo@bar.com',
        },
      },
      { ttl: 3599.045 }
    )
  })
})
