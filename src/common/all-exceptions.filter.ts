// src/common/all-exceptions.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { logger } from './logger'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const req = ctx.getRequest<Request>()
    const res = ctx.getResponse<Response>()

    // Determine HTTP status
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR

    // Extract our standardized payload or build a generic one
    const responsePayload = exception instanceof HttpException
      ? (exception.getResponse() as any)
      : {
          code: 'INTERNAL_ERROR',
          message: 'Something went wrong. Please try again later.',
        }

    // Log full error (stack trace if available)
    logger.error(
      {
        component: 'exception-filter',
        status,
        path: req.url,
        requestId: req.headers['x-request-id'],
        code: responsePayload.code,
      },
      exception instanceof Error ? exception.stack! : String(exception)
    )

    // Send uniform JSON error response
    res.status(status).json({
      code: responsePayload.code,
      message: responsePayload.message,
      details: responsePayload.details ?? null,
    })
  }
}
