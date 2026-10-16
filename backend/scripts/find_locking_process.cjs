const { execSync } = require('child_process');

try {
  const out = execSync('powershell "Get-NetTCPConnection -LocalPort 4000,5173 -ErrorAction SilentlyContinue | Select-Object LocalPort, OwningProcess"').toString();
  console.log(out);
} catch (e) {
  console.error(e.message);
}
