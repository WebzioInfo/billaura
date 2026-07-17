const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else {
      if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        results.push(filePath);
      }
    }
  });
  return results;
}

const files = walk('d:/Webzio/billaura/apps/frontend/src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Replace import
  if (content.includes("from 'sonner'") || content.includes('from "sonner"')) {
    content = content.replace(/import\s*\{\s*toast\s*\}\s*from\s*['"]sonner['"];?/g, "import notification from '@/services/NotificationService';");
    changed = true;
  }

  // Replace toast. with notification.
  if (content.includes('toast.')) {
    // Exclude NotificationService.ts from the toast. replacement
    if (!file.includes('NotificationService.ts')) {
      content = content.replace(/\btoast\./g, 'notification.');
      changed = true;
    }
  }

  // Also replace toast( with notification.info( if any exists (except NotificationService)
  if (content.match(/\btoast\(/)) {
    if (!file.includes('NotificationService.ts')) {
      content = content.replace(/\btoast\(/g, 'notification.info(');
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
