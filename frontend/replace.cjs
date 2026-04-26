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
  if (filePath.endsWith('.tsx') && !filePath.includes('LazyImage.tsx') && !filePath.includes('CurrencySelector.tsx') && !filePath.includes('LinkPreview.tsx') && !filePath.includes('ExpenseAttachments.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('<img ')) {
      // add import if not present
      if (!content.includes('LazyImage')) {
        let relPath = path.relative(path.dirname(filePath), path.join('src', 'shared', 'components', 'LazyImage'));
        relPath = relPath.replace(/\\/g, '/');
        if (!relPath.startsWith('.')) relPath = './' + relPath;

        content = `import { LazyImage } from '${relPath}';\n` + content;
      }
      
      // replace <img with <LazyImage
      content = content.replace(/<img\s/g, '<LazyImage ');
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated ' + filePath);
    }
  }
});
