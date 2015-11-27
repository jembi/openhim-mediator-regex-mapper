'use strict';

const tap = require('tap');
const http = require('http');
const testSer = require('./test-server');
const config = require('../config/config');
config.register = false;


// run main app
require('../index.js');

testSer.startServer(() => {
  console.log('Test server listening...');

  let options = {
    host: 'localhost',
    port: 8523,
    method: 'POST'
  };

  let req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => {
      body += chunk.toString();
    });

    res.on('end', () => {
      console.log('Mediator response: ' + body);
      tap.ok(body.indexOf('new'), 'Response replacements ran');
      process.exit();
    });
  });
  req.write('Test replaceme123 message. replaceme456, replaceme987.');
  console.log('Sending test request...');
  req.end();
});
