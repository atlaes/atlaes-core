import { Hono } from 'hono';
import { checkDatabaseConnection } from '../utils/db';
import { logger } from '../utils/logger';

const health = new Hono();

health.get('/', async (c) => {
  try {
    const dbHealth = await checkDatabaseConnection();
    
    const health = {
      status: dbHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth,
        // Add more services as they're implemented
        redis: { status: 'healthy', message: 'Redis connection not implemented yet' },
      },
    };
    
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    logger.info('Health check', { status: health.status });
    
    return c.json(health, statusCode);
  } catch (error) {
    logger.error('Health check failed', { error });
    
    return c.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      },
      503
    );
  }
});

export default health;
