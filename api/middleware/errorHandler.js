const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.stack || err);

  if (err.message === 'Not allowed by CORS') {
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