const fs = require('fs');
const path = require('path');

const hanziDir = path.join(__dirname, 'src', 'output', 'data', 'hanzi');
const files = fs.readdirSync(hanziDir);

let updatedCount = 0;

files.forEach(file => {
  if (file.endsWith('.json')) {
    const filePath = path.join(hanziDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    let modified = false;
    
    // Update SVG path to absolute path
    if (data.strokes && data.strokes.svg) {
      const oldPath = data.strokes.svg;
      // If it doesn't start with /, add it
      if (!oldPath.startsWith('/')) {
        data.strokes.svg = '/' + oldPath;
        modified = true;
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
      updatedCount++;
    }
  }
});

console.log(`Updated ${updatedCount} JSON files with absolute SVG paths.`);
