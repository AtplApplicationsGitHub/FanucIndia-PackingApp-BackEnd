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

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR

    const responsePayload = exception instanceof HttpException
      ? (exception.getResponse() as any)
      : {
          code: 'INTERNAL_ERROR',
          message: 'Something went wrong. Please try again later.',
        }

    const logMetadata = {
      component: 'exception-filter',
      status,
      path: req.url,
      requestId: req.headers['x-request-id'],
      code: responsePayload.code,
    }

    if (status === HttpStatus.NOT_FOUND) {
      logger.warn(
        logMetadata,
        exception instanceof Error ? exception.message : String(exception)
      )
    } else {
      logger.error(
        logMetadata,
        exception instanceof Error ? exception.stack! : String(exception)
      )
    }

    res.status(status).json({
      code: responsePayload.code,
      message: responsePayload.message,
      errors: responsePayload.errors ?? undefined,
      details: responsePayload.details ?? null,
    })
  }
}