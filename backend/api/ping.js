const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  const report = {
    cwd: process.cwd(),
    dirname: __dirname,
    nodeVersion: process.version,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? 'PRESENT (starts with ' + process.env.DATABASE_URL.substring(0, 15) + '...)' : 'MISSING',
      ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || 'MISSING',
      JWT_SECRET: process.env.JWT_SECRET ? 'PRESENT' : 'MISSING',
    },
    files: {},
    requireTests: {}
  };

  try {
    report.files['cwd'] = fs.readdirSync(process.cwd());
  } catch (e) {
    report.files['cwd'] = 'ERROR: ' + e.message;
  }

  try {
    report.files['dirname'] = fs.readdirSync(__dirname);
  } catch (e) {
    report.files['dirname'] = 'ERROR: ' + e.message;
  }

  try {
    report.files['parent'] = fs.readdirSync(path.resolve(__dirname, '..'));
  } catch (e) {
    report.files['parent'] = 'ERROR: ' + e.message;
  }

  const distPath = path.resolve(__dirname, '../dist');
  try {
    report.files['dist'] = fs.readdirSync(distPath);
  } catch (e) {
    report.files['dist'] = 'ERROR: ' + e.message;
  }

  // Test individual requires
  const packagesToTest = [
    'reflect-metadata',
    '@nestjs/core',
    '@nestjs/common',
    '@nestjs/platform-express',
    '@nestjs/config',
    '@prisma/client',
    'express',
    'helmet',
    'compression'
  ];

  for (const pkg of packagesToTest) {
    try {
      require(pkg);
      report.requireTests[pkg] = 'OK';
    } catch (e) {
      report.requireTests[pkg] = 'FAIL: ' + e.message;
    }
  }

  // Test loading app.module
  const candidateAppModules = [
    path.join(distPath, 'app.module.js'),
    path.resolve(process.cwd(), 'dist/app.module.js'),
    path.resolve(process.cwd(), 'backend/dist/app.module.js')
  ];

  for (const modPath of candidateAppModules) {
    try {
      if (fs.existsSync(modPath)) {
        require(modPath);
        report.requireTests[modPath] = 'OK';
      } else {
        report.requireTests[modPath] = 'NOT_FOUND';
      }
    } catch (e) {
      report.requireTests[modPath] = 'FAIL: ' + e.message + ' | stack: ' + e.stack;
    }
  }

  return res.status(200).json(report);
};
