// src/common/logger.ts
import pino from 'pino'

/**
 * Simple in-memory sampler that logs only 1 in N failures per IP+code per minute.
 */
class FailureSampler {
  private buckets = new Map<string, { count: number; resetAt: number }>()
  private readonly windowMs = 60_000 // 1 minute
  private readonly sampleRate: number

  constructor(sampleRate = 10) {
    this.sampleRate = sampleRate
  }

  shouldLog(ip: string, code: string): boolean {
    const key = `${ip}:${code}`
    const now = Date.now()
    let entry = this.buckets.get(key)

    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + this.windowMs }
      this.buckets.set(key, entry)
    }

    entry.count += 1
    // Log only the first, then every Nth
    return entry.count === 1 || entry.count % this.sampleRate === 0
  }
}

const sampler = new FailureSampler(10)

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: {
    pid: false,
    hostname: false,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    // never log full request body or sensitive headers
    req: (req) => ({
      method: req.method,
      url: req.url,
      id: req.id,           // correlation/request ID
      ip: req.ip,
    })
  }
})

/**
 * Log an auth failure, sampling repeated events.
 */
export function logAuthFailure({
  code,
  message,
  ip,
  userId,
  requestId,
}: {
  code: string
  message: string
  ip: string
  userId?: string
  requestId?: string
}) {
  if (!sampler.shouldLog(ip, code)) {
    return
  }
  logger.warn(
    {
      component: 'auth',
      code,
      ip,
      userId,
      requestId,
    },
    message
  )
}
