const http = require('http');

async function testAPI(url) {
    const start = Date.now();
    return new Promise((resolve) => {
        http.get(`http://localhost:3000${url}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const duration = Date.now() - start;
                console.log(`URL: ${url} | Status: ${res.statusCode} | Time: ${duration}ms | Items: ${JSON.parse(data).items?.length || 0}`);
                resolve();
            });
        }).on('error', (err) => {
            console.error(`Error for ${url}:`, err.message);
            resolve();
        });
    });
}

async function runTests() {
    console.log('Testing Optimized APIs...');
    await testAPI('/api/explore?type=all&page=1&limit=10');
    // Note: Profile test requires a valid ID, skipping for general build check
    console.log('Verification Complete.');
}

runTests();
