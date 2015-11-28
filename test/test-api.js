'use strict';

var util = require('util');

var express = require('express');

var Gofer = require('../');


//       if Url.parse(url).pathname == '/v1/zapp'
//         res.writeHead 200, 'Content-Type': 'application/json'
//         chunks = []
//         req.on 'data', (chunk) -> chunks.push chunk
//         req.on 'end', ->
//           body = Buffer.concat(chunks).toString 'utf8'
//           res.end JSON.stringify {url, method, headers, body}
//       else if url == '/v1/crash'
//         res.socket.destroy()
//       else if url == '/v1/fail-json'
//         res.writeHead 200, 'Content-Type': 'application/json'
//         res.end '{some-invalid-json}'
//       else
//         res.writeHead 404, 'Content-Type': 'application/json'
//         res.end JSON.stringify { message: 'not found' }

function createApp() {
  var app = express();
  app.get('/v1/zapp', function(req, res) {
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
    return function() { return request('/invalid'); };
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

function createClient(server) {
  var port = server.address().port;
  return new MyApi({
    globalDefaults: {
      appName: 'myApp',
      appSha: 'mySha',
    },
    myApi: {
      baseUrl: 'http://127.0.0.1:' + port + '/v1',
    },
  });
}
exports.createClient = createClient;
