const express = require('express');
const expressApp = express();

expressApp.use((req, res) => {
    res.status(200).json({ status: "alive and kicking", url: req.url, method: req.method });
});

module.exports = expressApp;
