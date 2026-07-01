module.exports = async function (req, res) {
  try {
    const handler = require('../dist/api/index').default;
    return await handler(req, res);
  } catch (err) {
    console.error("Vercel Startup Error in Wrapper:", err);
    res.status(500).json({
      error: "Vercel Startup Crash (Wrapper)",
      message: err.message,
      stack: err.stack,
    });
  }
};
