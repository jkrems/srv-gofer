/*
 * Copyright (c) 2015, Groupon, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * Redistributions of source code must retain the above copyright notice,
 * this list of conditions and the following disclaimer.
 *
 * Redistributions in binary form must reproduce the above copyright
 * notice, this list of conditions and the following disclaimer in the
 * documentation and/or other materials provided with the distribution.
 *
 * Neither the name of GROUPON nor the names of its contributors may be
 * used to endorse or promote products derived from this software without
 * specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
 * IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
 * TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 * PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
'use strict';

var fs = require('fs');
var http = require('http');
var https = require('https');
var url = require('url');

var fetch = require('../').fetch;

var testApi = require('./test-api');

var HTTPS_OPTIONS = {
  cert: fs.readFileSync('test/ssl/localhost.crt'),
  key: fs.readFileSync('test/ssl/localhost.key'),
  passphrase: 'password',
};

function createTestServer(handler, protocol) {
  protocol = protocol || 'http:';

  var server;
  if (protocol === 'https:') {
    server = https.createServer(HTTPS_OPTIONS, handler);
  } else {
    server = http.createServer(handler);
  }

  // This makes sure keep-alive connections don't mess with our server.close
  server.setTimeout(250, function(socket) {
    socket.destroy();
  });

  before('start test server', function(done) {
    server.on('error', done);
    server.listen(3000, function() { done(); });
    server.fetch = function fetch_(uri, options) {
      var defaultBaseUrl = protocol + '//localhost:' + server.address().port;
      if (typeof uri === 'object') {
        options = uri;
        options.baseUrl = options.baseUrl || defaultBaseUrl;
        return fetch(options);
      }
      options = options || {};
      options.baseUrl = options.baseUrl || defaultBaseUrl;
      return fetch(uri, options);
    };
  });

  after('close test server', function(done) {
    server.close(done);
  });

  return server;
}
exports.create = createTestServer;

function createApiServer(protocol) {
  protocol = protocol || 'http:';
  var server = createTestServer(testApi.createApp(), protocol);
  var client = server.client = {};

  before(function() {
    /* eslint no-proto:0 */
    var instance = testApi.createClient(server, protocol);
    client.__proto__ = instance;
    client.constructor = instance.constructor;
  });

  return server;
}
exports.api = createApiServer;

function echoServer(protocol) {
  return createTestServer(function(req, res) {
    var parsedUrl = url.parse(req.url, true);
    var latency = +parsedUrl.query.__latency || 0;
    var delay = +parsedUrl.query.__delay || 0;

    var chunks = [];

    function writeBody() {
      res.end(JSON.stringify({
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: Buffer.concat(chunks).toString(),
      }));
    }

    function writeResponse() {
      res.writeHead(200, {
        'Content-Type': 'application/json',
      });
      if (res.flushHeaders) {
        res.flushHeaders();
      } else {
        res.flush();
      }

      if (delay) {
        setTimeout(writeBody, delay);
      } else {
        writeBody();
      }
    }

    req.on('data', function(chunk) {
      chunks.push(chunk);
    });
    req.on('end', function() {
      if (latency) {
        setTimeout(writeResponse, latency);
      } else {
        writeResponse();
      }
    });
  }, protocol);
}
exports.echo = echoServer;
