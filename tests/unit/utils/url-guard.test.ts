import { describe, it, expect, afterEach } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import type { LookupAddress } from 'node:dns';
import {
  assertSafeUrl,
  createSafeAgents,
  createSafeLookup,
  isBlockedAddress,
  SsrfBlockedError,
} from '../../../src/utils/url-guard.js';

/** A resolver that answers from a fixed table instead of DNS. */
function fakeResolver(table: Record<string, LookupAddress[]>) {
  return (
    hostname: string,
    _options: unknown,
    callback: (err: NodeJS.ErrnoException | null, addresses: LookupAddress[]) => void
  ) => {
    const answer = table[hostname];
    if (!answer) {
      const err = new Error(`getaddrinfo ENOTFOUND ${hostname}`) as NodeJS.ErrnoException;
      err.code = 'ENOTFOUND';
      return callback(err, []);
    }
    callback(null, answer);
  };
}

describe('isBlockedAddress', () => {
  it.each([
    '0.0.0.0',
    '10.1.2.3',
    '100.64.0.1',
    '127.0.0.1',
    '127.255.255.254',
    '169.254.169.254', // cloud instance metadata
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '224.0.0.1',
    '255.255.255.255',
    '::',
    '::1',
    '::ffff:127.0.0.1',
    '::ffff:169.254.169.254',
    '64:ff9b::a9fe:a9fe',
    'fc00::1',
    'fd12:3456::1',
    'fe80::1',
    'ff02::1',
  ])('blocks %s', (address) => {
    expect(isBlockedAddress(address)).toBe(true);
  });

  it.each(['1.1.1.1', '8.8.8.8', '172.15.0.1', '172.32.0.1', '2606:4700:4700::1111'])(
    'allows public %s',
    (address) => {
      expect(isBlockedAddress(address)).toBe(false);
    }
  );

  it('treats a non-IP string as blocked', () => {
    expect(isBlockedAddress('example.com')).toBe(true);
  });
});

describe('assertSafeUrl', () => {
  it.each([
    'http://169.254.169.254/latest/meta-data/',
    'http://0.0.0.0/',
    'http://[::1]/',
    'http://[::ffff:127.0.0.1]/',
    'http://[fd00::1]/',
    'http://2130706433/', // decimal 127.0.0.1
    'http://0x7f000001/', // hex 127.0.0.1
    'http://0177.0.0.1/', // octal 127.0.0.1
    'http://127.1/', // short form
    'http://localhost/',
    'http://LOCALHOST./',
    'http://api.localhost/',
  ])('rejects %s', (url) => {
    expect(() => assertSafeUrl(new URL(url))).toThrow(SsrfBlockedError);
  });

  it.each(['file:///etc/passwd', 'ftp://example.com/file', 'data:text/plain,hi'])(
    'rejects the scheme of %s',
    (url) => {
      expect(() => assertSafeUrl(new URL(url))).toThrow(/Unsupported URL scheme/);
    }
  );

  it('rejects credentials in the URL', () => {
    expect(() => assertSafeUrl(new URL('https://user:pass@example.com/f'))).toThrow(
      /embedded credentials/
    );
  });

  it('accepts public URLs and leaves hostnames to the lookup', () => {
    expect(() => assertSafeUrl(new URL('https://example.com/file.png'))).not.toThrow();
    expect(() => assertSafeUrl(new URL('http://8.8.8.8/file.png'))).not.toThrow();
    expect(() => assertSafeUrl(new URL('https://[2606:4700:4700::1111]/f'))).not.toThrow();
  });
});

describe('createSafeLookup', () => {
  const lookup = createSafeLookup(
    fakeResolver({
      'public.test': [{ address: '93.184.215.14', family: 4 }],
      'metadata.test': [{ address: '169.254.169.254', family: 4 }],
      'dualstack.test': [
        { address: '93.184.215.14', family: 4 },
        { address: '::1', family: 6 },
      ],
    })
  );

  function run(hostname: string, options: object = {}) {
    return new Promise<{ err: Error | null; address: unknown; family?: number }>((resolve) =>
      lookup(hostname, options, (err, address, family) => resolve({ err, address, family }))
    );
  }

  it('returns the address of a public name', async () => {
    const result = await run('public.test');
    expect(result.err).toBeNull();
    expect(result.address).toBe('93.184.215.14');
    expect(result.family).toBe(4);
  });

  it('returns all addresses when asked for all', async () => {
    const result = await run('public.test', { all: true });
    expect(result.address).toEqual([{ address: '93.184.215.14', family: 4 }]);
  });

  it('rejects a name that resolves to an internal address', async () => {
    const result = await run('metadata.test');
    expect(result.err).toBeInstanceOf(SsrfBlockedError);
    expect(result.err?.message).toContain('169.254.169.254');
  });

  it('rejects a name when any of its addresses is internal', async () => {
    const result = await run('dualstack.test');
    expect(result.err).toBeInstanceOf(SsrfBlockedError);
  });

  it('passes resolver errors through', async () => {
    const result = await run('missing.test');
    expect((result.err as NodeJS.ErrnoException).code).toBe('ENOTFOUND');
  });
});

describe('createSafeAgents with a real socket', () => {
  let server: http.Server | undefined;

  afterEach(async () => {
    await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
    server = undefined;
  });

  it('never connects when a name resolves to loopback', async () => {
    let requests = 0;
    server = http.createServer((_req, res) => {
      requests++;
      res.end('internal secret');
    });
    await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;

    const { httpAgent } = createSafeAgents(
      fakeResolver({ 'rebind.test': [{ address: '127.0.0.1', family: 4 }] })
    );

    const error = await new Promise<Error>((resolve, reject) => {
      http
        .get({ host: 'rebind.test', port, path: '/', agent: httpAgent }, () =>
          reject(new Error('request reached the internal server'))
        )
        .on('error', resolve);
    });

    expect(error).toBeInstanceOf(SsrfBlockedError);
    expect(requests).toBe(0);
  });
});
