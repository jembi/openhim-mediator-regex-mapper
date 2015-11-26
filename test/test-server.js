'use strict';

let http = require('http');

exports.startServer = (callback) => {
  http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      console.log('Mediator request: ' + body);

      res.writeHead(200);
      res.end('Hello, replaceme456\n');
    });
  }).listen(8521, () => {
    if (callback) {
      callback();
    }
  });
};

if (!module.parent) {
  exports.startServer(() => console.log('test server listening on 8521...') );
}
