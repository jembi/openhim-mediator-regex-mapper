'use strict';

let http = require('http');

let options = {
  host: 'localhost',
  port: 5001,
  method: 'POST',
  path: '/regex/'
};
let req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => {
    body += chunk.toString();
  });

  res.on('end', () => {
    console.log('Mediator response: ' + body);
    process.exit();
  });
});
req.write('Test replaceme123 message. replaceme456, replaceme987.');
req.end();
