import { NextRequest, NextResponse } from 'next/server';
import { rateLimitMiddleware, rateLimitPresets } from './rateLimit';
import { logger } from './logger';
import { env } from './env';

/**
 * Helper function to wrap API route handlers with:
 * - Rate limiting
 * - Error handling
 * - Logging
 */
export function withApiHandler(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>,
  options: {
    rateLimit?: typeof rateLimitPresets.default;
    requireAuth?: boolean;
  } = {}
) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    try {
      // Apply rate limiting
      const rateLimitOptions = options.rateLimit || rateLimitPresets.default;
      const rateLimitResponse = rateLimitMiddleware(request, rateLimitOptions);
      if (rateLimitResponse) {
        logger.warn('Rate limit exceeded', {
          path: request.nextUrl.pathname,
          ip: request.headers.get('x-forwarded-for') || request.ip,
        });
        return rateLimitResponse;
      }

      // Call the actual handler
      return await handler(request, ...args);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      logger.error('API error', {
        path: request.nextUrl.pathname,
        method: request.method,
        error: errorMessage,
        stack: errorStack,
      });

      // Don't expose stack traces in production
      return NextResponse.json(
        {
          error: errorMessage,
          ...(env.NODE_ENV === 'development' && errorStack
            ? { details: errorStack }
            : {}),
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Safe error response - doesn't expose internal details in production
 */
export function safeErrorResponse(
  error: unknown,
  defaultMessage: string = 'An error occurred'
): NextResponse {
  const errorMessage = error instanceof Error ? error.message : defaultMessage;
  const errorStack = error instanceof Error ? error.stack : undefined;

  logger.error('API error response', {
    error: errorMessage,
    stack: errorStack,
  });

  return NextResponse.json(
    {
      error: errorMessage,
      ...(env.NODE_ENV === 'development' && errorStack
        ? { details: errorStack }
        : {}),
    },
    { status: 500 }
  );
}
