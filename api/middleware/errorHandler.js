const errorHandler = (err, req, res, next) => {
  console.error('=== ERROR CAUGHT ===');
  console.error('Error:', err.stack || err);
  console.error('Request details:', {
    url: req.url,
    method: req.method,
    body: req.body,
    origin: req.headers.origin,
    referer: req.headers.referer
  });
  console.error('==================');

  if (err.message === 'Not allowed by CORS') {
    console.error('CORS rejection from:', req.headers.origin);
    return res.status(403).json({
      success: false,
      message: 'Access denied.'
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Something went wrong. Please try again later.'
      : err.message
  });
};

module.exports = { errorHandler };