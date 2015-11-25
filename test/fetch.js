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
          body: Buffer.concat(chunks).toString(),
        }));
      });
    });
    server.on('error', done);
    server.listen(3000, function() { done(); });
    server.fetch = function fetch_(uri, options) {
      options = options || {};
      options.baseUrl = 'http://localhost:' + server.address().port;
      return fetch(uri, options);
    };
  });

  after('close echo server', function(done) {
    server.close(done);
  });

  it('can fetch stuff', function() {
    var headers = { 'x-Fancy': 'stuff' };
    headers['X-Fancy'] = 'other stuff';
    return server.fetch('/foo', { headers: headers })
      .json()
      .then(function(echo) {
        assert.equal('GET', echo.method);
        assert.equal('/foo', echo.url);
        assert.equal('', echo.body);
        assert.equal('overriding headers works thanks to key ordering',
          'other stuff', echo.headers['x-fancy']);
      });
  });

  it('uses qs-style query strings', function() {
    return server.fetch('/', { qs: { thing: [ 'abc', 'xyz' ] } })
      .json()
      .then(function(echo) {
        assert.equal('/?thing[0]=abc&thing[1]=xyz', decodeURIComponent(echo.url));
      });
  });
});
