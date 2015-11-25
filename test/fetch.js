'use strict';

var http = require('http');

var assert = require('assertive');

var fetch = require('../lib/fetch');

describe('fetch', function() {
  var server;

  before('start echo server', function(done) {
    server = http.createServer(function(req, res) {
      var chunks = [];
      req.on('data', function(chunk) {
        chunks.push(chunk);
      });
      req.on('end', function() {
        res.writeHead(200, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({
          method: req.method,
          url: req.url,
          headers: req.headers,
          body: Buffer.concat(chunks).toString()
        }));
      });
    });
    server.on('error', done);
    server.listen(3000, function() { done(); });
  });

  after('close echo server', function(done) {
    server.close(done);
  });

  it('can fetch stuff', function() {
    var headers = { 'x-Fancy': 'stuff' };
    headers['X-Fancy'] = 'other stuff';
    return fetch('http://localhost:3000/foo', { headers: headers })
      .json()
      .then(function(echo) {
        assert.equal('GET', echo.method);
        assert.equal('/foo', echo.url);
        assert.equal('', echo.body);
        assert.equal('overriding headers works thanks to key ordering',
          'other stuff', echo.headers['x-fancy']);
      });
  });
});
