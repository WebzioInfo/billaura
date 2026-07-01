module.exports = async function (req, res) {
  try {
    const handler = require('../dist/api/index').default;
    return await handler(req, res);
  } catch (err) {
    console.error("Vercel Startup Wrapper Error:", err);
    res.status(500).json({
      error: "Vercel Startup Wrapper Crash",
      message: err.message,
      stack: err.stack,
    });
  }
};
