export function getRequestAuditMeta(req: any): {
  ip?: string;
  userAgent?: string;
} {
  const userAgentHeader = req?.headers?.['user-agent'];
  const userAgent =
    typeof userAgentHeader === 'string' ? userAgentHeader : undefined;

  const ip = typeof req?.ip === 'string' ? req.ip : undefined;

  return { ip, userAgent };
}
