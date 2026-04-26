import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import client from 'prom-client';
import { env } from './env';

// Initialize Sentry
export const initSentry = () => {
  if (env.SENTRY_DSN) {
    Sentry.init({
      dsn: env.SENTRY_DSN,
      integrations: [
        nodeProfilingIntegration(),
      ],
      tracesSampleRate: 1.0,
      profilesSampleRate: 1.0,
    });
  }
};

// Initialize Prom-client
client.collectDefaultMetrics();

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

export const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of DB queries in seconds',
  labelNames: ['query'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2]
});

export const activeWebSockets = new client.Gauge({
  name: 'active_websocket_connections',
  help: 'Number of active WebSocket connections'
});

export const metricsRegistry = client.register;
