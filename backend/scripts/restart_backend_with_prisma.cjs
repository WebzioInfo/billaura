const { execSync, spawn } = require('child_process');

console.log('Stopping PID 28180...');
try {
  process.kill(28180, 'SIGKILL');
} catch (e) {
  console.log('Kill PID 28180 note:', e.message);
}

// Also check any process on port 4000
try {
  execSync('powershell "Stop-Process -Id (Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue).OwningProcess -Force -ErrorAction SilentlyContinue"');
} catch (e) {}

// Wait 2s
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await sleep(2000);
  console.log('Running npx prisma generate...');
  const genOut = execSync('npx prisma generate').toString();
  console.log(genOut);
}

main().catch(console.error);
