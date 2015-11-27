'use strict';

const http = require('http');
const utils = require('openhim-mediator-utils');
const replaceStream = require('replacestream');

// Config
var config; // this will vary depending on whats set in openhim-core
const apiConf = require('./config/config');
const mediatorConfig = require('./config/mediator');

function setupReplaceStream(inStream, replacementsMap) {
  let finalStream = inStream;
  Object.keys(replacementsMap).forEach(function (key) {
    let regex = new RegExp(key, 'g');
    let replacement = replacementsMap[key];
    finalStream = finalStream.pipe(replaceStream(regex, replacement));
  });
  return finalStream;
}

if (process.env.NODE_ENV == 'test') {
  // expose functions for unit testing
  exports.setupReplaceStream = setupReplaceStream;
}

function setupServer() {
  let server = http.createServer((inReq, outRes) => {
    let reqTranformStream = setupReplaceStream(inReq, config.reqReplacements);

    let options = {
      hostname: config.upstream.host,
      port: config.upstream.port,
      path: config.upstream.path,
      method: inReq.method,
      headers: inReq.headers
    };
    delete options.headers.host;

    let outReq = http.request(options, (inRes) => {
      let resTranformStream = setupReplaceStream(inRes, config.resReplacements);

      outRes.writeHead(inRes.statusCode, inRes.headers);
      resTranformStream.pipe(outRes);
    });

    reqTranformStream.pipe(outReq);
  });

  return server;
}
exports.setupServer = setupServer;

// start-up procedure
if (apiConf.register) {
  utils.registerMediator(apiConf.api, mediatorConfig, (err) => {
    if (err) {
      console.log('Failed to register this mediator, check your config');
      console.log(err.stack);
      process.exit(1);
    }
    apiConf.api.urn = mediatorConfig.urn;
    utils.fetchConfig(apiConf.api, (err, newConfig) => {
      console.log('Received initial config:');
      console.log(JSON.stringify(newConfig));
      config = newConfig;
      if (err) {
        console.log('Failed to fetch initial config');
        console.log(err.stack);
        process.exit(1);
      } else {
        console.log('Successfully registered mediator!');
        let server = setupServer();
        server.listen(8523, () => console.log('Listening on 8523...') );
        let configEmitter = utils.activateHeartbeat(apiConf.api);
        configEmitter.on('config', (newConfig) => {
          console.log('Received updated config:');
          console.log(JSON.stringify(newConfig));
          config = newConfig;
        });
      }
    });
  });
} else {
  // default to config from mediator registration
  config = mediatorConfig.config;
  let server = setupServer();
  server.listen(8523, () => console.log('Listening on 8523...') );
}
