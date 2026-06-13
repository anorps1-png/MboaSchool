const http = require('http');

console.log('Fetching http://localhost:3000/finance ...');
const req = http.get('http://localhost:3000/finance', (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
  res.on('data', (chunk) => {
    console.log('Body chunk length:', chunk.length);
  });
});

req.on('error', (err) => {
  console.error('HTTP Error:', err.message);
});

req.end();
