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

  // Replace useQuery<any> and useQuery<any[]>
  if (content.includes('useQuery<any>') || content.includes('useQuery<any[]>')) {
    content = content.replace(/useQuery<any>/g, 'useQuery<unknown>');
    content = content.replace(/useQuery<any\[\]>/g, 'useQuery<unknown[]>');
    changed = true;
  }
  
  if (content.includes('useAsyncForm<any>')) {
      content = content.replace(/useAsyncForm<any>/g, 'useAsyncForm<unknown>');
      changed = true;
  }

  // Same for useMutation
  if (content.includes('useMutation<any') || content.includes('useMutation<any,')) {
    content = content.replace(/useMutation<any,/g, 'useMutation<unknown,');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
