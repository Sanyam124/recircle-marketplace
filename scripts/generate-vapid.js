// Generate VAPID keys and write directly to .env file
// This avoids terminal corruption issues
const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

const keys = webpush.generateVAPIDKeys();
const envPath = path.join(__dirname, '..', '.env');

const content = `NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}
VAPID_PRIVATE_KEY=${keys.privateKey}
VAPID_SUBJECT=mailto:admin@recircle.info
`;

fs.writeFileSync(envPath, content, 'utf8');

console.log('VAPID keys written to .env');
console.log('Public key length:', keys.publicKey.length, 'characters');
console.log('Private key length:', keys.privateKey.length, 'characters');
