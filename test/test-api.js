'use strict';

var util = require('util');

var express = require('express');

var Gofer = require('../');

function createApp() {
  var app = express();

  app.all('/v1/zapp', function(req, res) {
    var chunks = [];
    req.on('data', function(chunk) { chunks.push(chunk); });
    req.on('end', function() {
      var body = Buffer.concat(chunks).toString();
      res.json({
        url: req.url,
        method: req.method,
        headers: req.headers,
        body: body,
      });
    });
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
