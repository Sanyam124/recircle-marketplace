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
        } else {
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const targetDir = path.join(__dirname, 'src', 'app', 'api');
const files = walk(targetDir);
let changedFiles = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Regex to match: const limit = parseInt(searchParams.get('limit') || '24');
    const regex = /(const|let)\s+limit\s*=\s*parseInt\(\s*searchParams\.get\(['"]limit['"]\)\s*\|\|\s*['"](\d+)['"]\s*\);/g;
    
    if (regex.test(content)) {
        const newContent = content.replace(regex, (match, p1, p2) => {
            return `const requestedLimit = parseInt(searchParams.get('limit') || '${p2}');\n        ${p1} limit = Math.min(requestedLimit, 50);`;
        });
        fs.writeFileSync(file, newContent, 'utf8');
        changedFiles++;
        console.log("Patched:", file);
    }
});

console.log(`Finished patching ${changedFiles} files.`);
