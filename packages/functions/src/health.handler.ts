// Separate health handler for SST Lambda
import { checkDatabaseConnection } from './utils/db';
import { logger } from './utils/logger';

export const handler = async (_event: any) => {
  try {
    const dbHealth = await checkDatabaseConnection();

    const health = {
      status: dbHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth,
        redis: {
          status: 'healthy',
          message: 'Redis connection not implemented yet',
        },
      },
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;

    logger.info('Health check', { status: health.status });

    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      },
      body: JSON.stringify(health),
    };
  } catch (error) {
    logger.error('Health check failed', { error });

    return {
      statusCode: 503,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      }),
    };
  }
};
