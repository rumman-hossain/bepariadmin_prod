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
    } else if (file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./components');
files.push('./App.tsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  // Replace background and text colors for inputs, selects, textareas
  // This is a bit tricky with regex, let's just replace the specific tailwind classes
  content = content.replace(/bg-slate-50 dark:bg-charcoal-[0-9]{3}/g, 'bg-white');
  content = content.replace(/bg-white dark:bg-charcoal-[0-9]{3}/g, 'bg-white');
  content = content.replace(/text-slate-900 dark:text-white/g, 'text-black');
  content = content.replace(/text-slate-800 dark:text-white/g, 'text-black');
  
  // Add min="0" to type="number" if not exists
  // Regex to find type="number" and add min="0"
  content = content.replace(/type="number"(?!\s+min=)/g, 'type="number" min="0"');
  content = content.replace(/type=\{'number'\}(?!\s+min=)/g, 'type="number" min="0"');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
