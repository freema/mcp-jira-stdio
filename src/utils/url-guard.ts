/**
 * SSRF guard for downloading user-supplied URLs (jira_add_attachment with fileUrl).
 *
 * A tool argument can come from content the agent reads (prompt injection), so the
 * URL is untrusted. The checks run on resolved IP addresses, not on the hostname:
 *
 * - IP literals in the URL are checked before any request. The WHATWG URL parser has
 *   already normalised decimal, hex and octal IPv4 forms and IPv6 brackets.
 * - Hostnames are resolved by the agent's `lookup`, which rejects the connection when
 *   any resolved address is not public. The socket connects to the address that was
 *   checked, so a second DNS answer cannot swap in an internal one (DNS rebinding).
 * - Redirects are followed by hand and every hop goes through the same checks.
 */
import dns, { LookupAddress, LookupOptions } from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';

export class SsrfBlockedError extends Error {
  constructor(message: string) {
    super(`${message} (SSRF protection)`);
    this.name = 'SsrfBlockedError';
  }
}

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Addresses that are not reachable public unicast: loopback, private, link-local, etc.
 * Two lists, because a BlockList also matches IPv4 addresses against IPv4-mapped IPv6
 * rules, so `::ffff:0:0/96` in a shared list would block every IPv4 address.
 */
const ipv4BlockList = new net.BlockList();
const ipv6BlockList = new net.BlockList();
for (const [network, prefix] of [
  ['0.0.0.0', 8], // "this network", includes 0.0.0.0
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // carrier-grade NAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local, cloud instance metadata (169.254.169.254)
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // documentation
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // documentation
  ['203.0.113.0', 24], // documentation
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved, includes 255.255.255.255
] as const) {
  ipv4BlockList.addSubnet(network, prefix, 'ipv4');
}
for (const [network, prefix] of [
  ['::', 128], // unspecified
  ['::1', 128], // loopback
  ['::ffff:0:0', 96], // IPv4-mapped: the embedded IPv4 address would bypass the IPv4 rules
  ['64:ff9b::', 96], // NAT64: maps to arbitrary IPv4, including internal ranges
  ['100::', 64], // discard
  ['2001:db8::', 32], // documentation
  ['fc00::', 7], // unique local (includes fd00::/8)
  ['fe80::', 10], // link-local
  ['ff00::', 8], // multicast
] as const) {
  ipv6BlockList.addSubnet(network, prefix, 'ipv6');
}

/** True when `address` is an IP that must not be fetched. Non-IP input counts as blocked. */
export function isBlockedAddress(address: string): boolean {
  const family = net.isIP(address);
  if (family === 4) return ipv4BlockList.check(address, 'ipv4');
  if (family === 6) return ipv6BlockList.check(address, 'ipv6');
  return true;
}

/** Hostname as used for connecting: URL hostnames keep IPv6 literals in brackets. */
function bareHostname(url: URL): string {
  return url.hostname.replace(/^\[(.*)\]$/, '$1');
}

/**
 * Checks what can be checked without DNS: scheme, credentials in the URL, IP literals and
 * localhost names.
 * Hostnames are checked after resolution by the lookup from `createSafeLookup`.
 */
export function assertSafeUrl(url: URL): void {
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new SsrfBlockedError(`Unsupported URL scheme "${url.protocol}", use http or https`);
  }
  if (url.username || url.password) {
    throw new SsrfBlockedError('URLs with embedded credentials are not allowed');
  }
  // A trailing dot (fully qualified name, `localhost.`) names the same host.
  const host = bareHostname(url).toLowerCase().replace(/\.+$/, '');
  // localhost and *.localhost always mean loopback (RFC 6761), whatever DNS says.
  if (host === 'localhost' || host.endsWith('.localhost')) {
    throw new SsrfBlockedError(`Cannot download from ${host}: not a public address`);
  }
  if (net.isIP(host) && isBlockedAddress(host)) {
    throw new SsrfBlockedError(`Cannot download from ${host}: not a public address`);
  }
}

type LookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string | LookupAddress[],
  family?: number
) => void;

type Resolver = (
  hostname: string,
  options: LookupOptions & { all: true },
  callback: (err: NodeJS.ErrnoException | null, addresses: LookupAddress[]) => void
) => void;

const defaultResolver: Resolver = (hostname, options, callback) =>
  dns.lookup(hostname, options, callback);

/**
 * A `lookup` for http(s).Agent that resolves all addresses and fails when any of them is
 * not public. Rejecting on any (not only the first) blocked address keeps a dual-stack or
 * round-robin name from slipping an internal address past the check.
 */
export function createSafeLookup(resolve: Resolver = defaultResolver) {
  return (
    hostname: string,
    options: LookupOptions | number | undefined,
    callback: LookupCallback
  ) => {
    const opts: LookupOptions =
      typeof options === 'number' ? { family: options } : { ...(options ?? {}) };
    resolve(hostname, { ...opts, all: true }, (err, addresses) => {
      if (err) return callback(err, []);
      if (!addresses || addresses.length === 0) {
        return callback(new SsrfBlockedError(`Cannot resolve ${hostname}`), []);
      }
      const blocked = addresses.find((a) => isBlockedAddress(a.address));
      if (blocked) {
        return callback(
          new SsrfBlockedError(
            `Cannot download from ${hostname}: it resolves to ${blocked.address}, not a public address`
          ),
          []
        );
      }
      if (opts.all) return callback(null, addresses);
      const [first] = addresses;
      return callback(null, first!.address, first!.family);
    });
  };
}

export function createSafeAgents(resolve?: Resolver): {
  httpAgent: http.Agent;
  httpsAgent: https.Agent;
} {
  const lookup = createSafeLookup(resolve) as unknown as net.LookupFunction;
  return {
    httpAgent: new http.Agent({ lookup }),
    httpsAgent: new https.Agent({ lookup }),
  };
}

export const MAX_REDIRECTS = 5;
