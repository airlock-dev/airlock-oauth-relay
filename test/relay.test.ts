import { describe, it, expect } from 'vitest';
import worker from '../src/index.js';

function makeRequest(url: string, method = 'GET'): Request {
  return new Request(url, { method });
}

describe('OAuth relay worker', () => {
  it('302 redirects to localhost with unwrapped state', async () => {
    const res = await worker.fetch(
      makeRequest('https://relay.example.com/callback?code=abc123&state=18432.origstate')
    );
    expect(res.status).toBe(302);
    const location = res.headers.get('Location')!;
    const url = new URL(location);
    expect(url.origin).toBe('http://127.0.0.1:18432');
    expect(url.pathname).toBe('/oauth/callback');
    expect(url.searchParams.get('code')).toBe('abc123');
    expect(url.searchParams.get('state')).toBe('origstate');
  });

  it('passes through extra query params from the OAuth provider', async () => {
    const res = await worker.fetch(
      makeRequest(
        'https://relay.example.com/callback?code=abc&state=9000.xyz&scope=read+write&token_type=bearer'
      )
    );
    expect(res.status).toBe(302);
    const url = new URL(res.headers.get('Location')!);
    expect(url.searchParams.get('scope')).toBe('read write');
    expect(url.searchParams.get('token_type')).toBe('bearer');
    expect(url.searchParams.get('code')).toBe('abc');
    expect(url.searchParams.get('state')).toBe('xyz');
  });

  it('handles state with dots in the original value', async () => {
    const res = await worker.fetch(
      makeRequest('https://relay.example.com/callback?code=c&state=18432.some.dotted.state')
    );
    expect(res.status).toBe(302);
    const url = new URL(res.headers.get('Location')!);
    expect(url.searchParams.get('state')).toBe('some.dotted.state');
    expect(url.origin).toBe('http://127.0.0.1:18432');
  });

  it('handles empty original state (port only)', async () => {
    const res = await worker.fetch(
      makeRequest('https://relay.example.com/callback?code=abc&state=18432.')
    );
    expect(res.status).toBe(302);
    const url = new URL(res.headers.get('Location')!);
    expect(url.searchParams.get('state')).toBe('');
    expect(url.searchParams.get('code')).toBe('abc');
    expect(url.origin).toBe('http://127.0.0.1:18432');
  });

  it('returns 404 for non-callback paths', async () => {
    const res = await worker.fetch(makeRequest('https://relay.example.com/'));
    expect(res.status).toBe(404);
  });

  it('returns 404 for POST requests', async () => {
    const res = await worker.fetch(
      makeRequest('https://relay.example.com/callback?code=a&state=8000.s', 'POST')
    );
    expect(res.status).toBe(404);
  });

  it('returns 400 when code is missing', async () => {
    const res = await worker.fetch(
      makeRequest('https://relay.example.com/callback?state=8000.s')
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when state is missing', async () => {
    const res = await worker.fetch(
      makeRequest('https://relay.example.com/callback?code=abc')
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when state has no dot separator', async () => {
    const res = await worker.fetch(
      makeRequest('https://relay.example.com/callback?code=abc&state=nodot')
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for port below 1024', async () => {
    const res = await worker.fetch(
      makeRequest('https://relay.example.com/callback?code=abc&state=80.origstate')
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for port above 65535', async () => {
    const res = await worker.fetch(
      makeRequest('https://relay.example.com/callback?code=abc&state=99999.origstate')
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-numeric port', async () => {
    const res = await worker.fetch(
      makeRequest('https://relay.example.com/callback?code=abc&state=notaport.origstate')
    );
    expect(res.status).toBe(400);
  });
});
