try {
  module.exports = require('../dist/api/index').default;
} catch (error) {
  console.error("Top level require failed:", error);
  module.exports = (req, res) => {
    res.status(500).json({
      error: "Top level require failed",
      message: error.message,
      stack: error.stack
    });
  };
}
