export function isRedactionEnabled(): boolean {
  const val = process.env.MCP_REDACT_SENSITIVE || process.env.REDACT_SENSITIVE;
  return val === '1' || val?.toLowerCase() === 'true';
}

export function maybeRedactAccountId(accountId?: string | null): string {
  if (!accountId) return 'N/A';
  if (!isRedactionEnabled()) return accountId;
  // Show first 4 chars and mask the rest to keep stable identifiers without full disclosure
  const head = accountId.slice(0, 4);
  return `${head}…`; // masked
}

export function maybeRedactEmail(email?: string | null): string {
  if (!email) return 'N/A';
  if (!isRedactionEnabled()) return email;
  return 'hidden';
}
