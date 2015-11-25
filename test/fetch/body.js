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

var assert = require('assertive');

var testServer = require('../test-server');

describe('fetch/body', function() {
  var server = testServer.echo();

  it('can send a body as a string', function() {
    var payload = 'With 💩 character';
    return server.fetch('/', {
      method: 'POST',
      body: payload,
    }).json().then(function(echo) {
      assert.equal(payload, echo.body);
      assert.equal(Buffer.byteLength(payload), +echo.headers['content-length']);
      assert.equal(undefined, echo.headers['content-type']);
    });
  });

  it('can send a body as a buffer', function() {
    var payload = new Buffer('With 💩 character');
    return server.fetch('/', {
      method: 'POST',
      body: payload,
    }).json().then(function(echo) {
      assert.equal(payload.toString(), echo.body);
      assert.equal(payload.length, +echo.headers['content-length']);
      assert.equal(undefined, echo.headers['content-type']);
    });
  });

  it('can send a body as a stream', function() {
    var licenseStream = fs.createReadStream('LICENSE');
    var license = fs.readFileSync('LICENSE', 'utf8');
    return server.fetch('/', {
      method: 'POST',
      body: licenseStream,
    }).json().then(function(echo) {
      assert.equal(license, echo.body);
      assert.equal('chunked', echo.headers['transfer-encoding']);
      assert.equal(undefined, echo.headers['content-length']);
      assert.equal(undefined, echo.headers['content-type']);
    });
  });
});
