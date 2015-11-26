'use strict';

const http = require('http');
const utils = require('openhim-mediator-utils');

// Config
var config; // this will vary depending on whats set in openhim-core
const apiConf = require('./config/config');
const mediatorConfig = require('./config/mediator');

function startApp() {
  http.createServer((inReq, outRes) => {
    let inReqBody = '';
    inReq.on('data', (chunk) => {
      inReqBody += chunk.toString();
    });

    inReq.on('end', () => {
      console.log('Recieved body: ' + inReqBody);
      // execute replacements
      Object.keys(config.reqReplacements).forEach(function (key) {
        let regex = new RegExp(key, 'g');
        let replacement = config.reqReplacements[key];
        inReqBody = inReqBody.replace(regex, replacement);
      });

      let options = {
        hostname: config.upstream.host,
        port: config.upstream.port,
        path: config.upstream.path,
        method: inReq.method,
        headers: inReq.headers
      };
      delete options.headers.host;

      let outReq = http.request(options, (inRes) => {
        let inResBody = '';
        inRes.on('data', (chunk) => {
          inResBody += chunk.toString();
        });

        inRes.on('end', () => {
          // execute replacements
          Object.keys(config.resReplacements).forEach(function (key) {
            let regex = new RegExp(key, 'g');
            let replacement = config.resReplacements[key];
            inResBody = inResBody.replace(regex, replacement);
          });

          outRes.writeHead(inRes.statusCode, inRes.headers);
          outRes.write(inResBody);
          outRes.end();
        });
      });

      outReq.write(inReqBody);
      console.log('sending request...');
      outReq.end();
      console.log('Ended request...');
    });
  }).listen(8523, () => console.log('Listening on 8523...') );
}

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
        startApp();
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
  startApp();
}
