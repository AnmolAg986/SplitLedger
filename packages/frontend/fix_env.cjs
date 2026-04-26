const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('src', function(filePath) {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('http://localhost:3000')) {
      // 1. Fix single quotes with exact match
      content = content.replace(/'http:\/\/localhost:3000'/g, "`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}`");
      // 2. Fix single quotes with paths (e.g. '/auth/refresh')
      content = content.replace(/'http:\/\/localhost:3000([^']+)'/g, "`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}$1`");
      // 3. Fix instances inside backticks
      content = content.replace(/http:\/\/localhost:3000/g, "${import.meta.env.VITE_API_URL || 'http://localhost:3000'}");
      
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated ' + filePath);
    }
  }
});
