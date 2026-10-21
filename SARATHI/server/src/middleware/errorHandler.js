export function errorHandler(err, req, res, next) {
  console.error('[API Error]:', err.message);

  const status = err.status || err.statusCode || 400;
  res.status(status).json({
    error: err.message || 'An unexpected error occurred',
    code: err.code || (status === 403 ? 'FORBIDDEN' : 'BAD_REQUEST'),
    timestamp: new Date().toISOString(),
  });
}
