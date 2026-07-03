const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) { 
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;
  // Replace navigate('/auth/...') with navigate('/...')
  newContent = newContent.replace(/navigate\(['`]\/auth\/([^'`]+)['`]\)/g, 'navigate(\'/$1\')');
  // Replace navigate(`/auth/... with navigate(`/...
  newContent = newContent.replace(/navigate\(`\/auth\//g, 'navigate(`/');
  // Replace to="/auth/..." with to="/..."
  newContent = newContent.replace(/to="\/auth\/([^"]+)"/g, 'to="/$1"');
  // In ProtectedRoute: Navigate to="/auth/login"
  newContent = newContent.replace(/Navigate to="\/auth\/login"/g, 'Navigate to="/login"');
  // Fix Link to="/auth/login"
  newContent = newContent.replace(/to="\/auth\/login"/g, 'to="/login"');
  
  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log('Updated', file);
  }
});
