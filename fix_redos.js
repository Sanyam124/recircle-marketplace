const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'api', 'explore', 'route.ts');
let content = fs.readFileSync(filePath, 'utf8');

const targetContent = `                    return [
                        { title: { $regex: coreTerm, $options: 'i' } },
                        { description: { $regex: coreTerm, $options: 'i' } },
                        { category: { $regex: coreTerm, $options: 'i' } }
                    ];`;

const replacementContent = `                    const escapedTerm = coreTerm.replace(/[.*+?^$\{}(\\)|[\\]\\\\\\/]/g, '\\\\$&');
                    return [
                        { title: { $regex: escapedTerm, $options: 'i' } },
                        { description: { $regex: escapedTerm, $options: 'i' } },
                        { category: { $regex: escapedTerm, $options: 'i' } }
                    ];`;

// Using replace with index to be safe
if (content.includes('coreTerm, $options: \'i\'')) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('{ title: { $regex: coreTerm, $options: \'i\' } }')) {
            lines.splice(i, 0, '                    const escapedTerm = coreTerm.replace(/[.*+?^${}()|[\\]\\\\]/g, \'\\\\$&\');');
            lines[i+1] = lines[i+1].replace('coreTerm', 'escapedTerm');
            lines[i+2] = lines[i+2].replace('coreTerm', 'escapedTerm');
            lines[i+3] = lines[i+3].replace('coreTerm', 'escapedTerm');
            break;
        }
    }
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log('Successfully patched explore/route.ts for ReDoS');
} else {
    console.log('Target not found in explore/route.ts');
}
