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

var util = require('util');

var express = require('express');

var Gofer = require('../');

function createApp() {
  var app = express();

  app.all('/v1/zapp', function(req, res) {
    var latency = +req.query.__latency || 0;
    var delay = +req.query.__delay || 0;
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

    req.on('data', function(chunk) { chunks.push(chunk); });
    req.on('end', function() {
      if (latency) {
        setTimeout(writeResponse, latency);
      } else {
        writeResponse();
      }
    });
  });

  app.get('/v1/redirect', function(req, res) {
    res.redirect(301, '/v1/crash');
  });

  app.get('/v1/crash', function(req) {
    req.socket.destroy();
  });

  app.get('/v1/non-200-json', function(req, res) {
    res.status(400).json({ reason: 'Wrong URL' });
  });

  app.get('/v1/fail-json', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.end('{some-invalid-json}');
  });

  return app;
}
exports.createApp = createApp;

function MyApi() {
  Gofer.apply(this, arguments);
}
util.inherits(MyApi, Gofer);

MyApi.prototype.serviceName = 'myApi';
MyApi.prototype.serviceVersion = '1.0.0';

MyApi.prototype.registerEndpoints({
  zapp: function(request) {
    return function() { return request('/zapp'); };
  },
  fail: function(request) {
    return function() { return request('/non-200-json'); };
  },
  failJSON: function(request) {
    return function() { return request('/fail-json'); };
  },
  query: function(request) {
    return function() { return request('/zapp?p=1'); };
  },
  undef: function(request) {
    return function() {
      var qs = { a: undefined, b: null, c: 'non-null' };
      return request('/zapp', { qs: qs });
    };
  },
  undefHeaders: function(request) {
    return function() {
      var headers = { a: undefined, b: null, c: 'non-null' };
      return request('/zapp', { headers: headers });
    };
  },
  crash: function(request) {
    return function() {
      return request('/crash');
    };
  },
});

function createClient(server, protocol) {
  var port = server.address().port;
  return new MyApi({
    globalDefaults: {
      appName: 'myApp',
      appSha: 'mySha',
    },
    myApi: {
      baseUrl: protocol + '//127.0.0.1:' + port + '/v1',
    },
  });
}
exports.createClient = createClient;
