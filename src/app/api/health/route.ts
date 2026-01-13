import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Health check endpoint
 * Used by monitoring tools to check application status
 * Returns 200 if healthy, 503 if unhealthy
 */
export async function GET() {
  const startTime = Date.now();
  const health: {
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    uptime: number;
    services: {
      database: 'ok' | 'error';
      databaseLatency?: number;
    };
    version?: string;
  } = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: 'ok',
    },
  };

  try {
    // Check database connectivity
    const dbStartTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - dbStartTime;
    
    health.services.database = 'ok';
    health.services.databaseLatency = dbLatency;
    
    // Optional: Add version info
    if (process.env.npm_package_version) {
      health.version = process.env.npm_package_version;
    }
    
    const totalLatency = Date.now() - startTime;
    
    logger.info('Health check passed', {
      latency: totalLatency,
      dbLatency,
    });
    
    return NextResponse.json(health, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    health.status = 'unhealthy';
    health.services.database = 'error';
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('Health check failed', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      {
        ...health,
        error: process.env.NODE_ENV === 'development' ? errorMessage : 'Service unavailable',
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }
}
