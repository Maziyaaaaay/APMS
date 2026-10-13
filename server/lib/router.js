import express from 'express';

// Express 4 does not forward rejected promises from async route handlers.
export function createRouter() {
  const router = express.Router();
  for (const method of ['get', 'post', 'put', 'patch', 'delete', 'use']) {
    const register = router[method].bind(router);
    router[method] = (...args) => register(...args.map(arg => {
      if (typeof arg !== 'function' || arg.constructor.name !== 'AsyncFunction') return arg;
      return (req, res, next) => Promise.resolve(arg(req, res, next)).catch(next);
    }));
  }
  return router;
}
