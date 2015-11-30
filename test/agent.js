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

var assert = require('assertive');

var testServer = require('./test-server');

function assertRejects(promise) {
  var unexpectedError = new Error('Expected to fail');
  return promise.then(function() {
    throw unexpectedError;
  }, function(error) {
    return error;
  });
}

describe('Agent & handling', function() {
  describe('https', function() {
    var myApi = testServer.api('https:').client;

    it('rejects self-signed certificate', function() {
      return assertRejects(myApi.zapp().json())
        .then(function(error) {
          assert.equal('self signed certificate', error.message);
        });
    });

    it('allows requests with rejectUnauthorized=false', function() {
      return myApi.with({ rejectUnauthorized: false }).zapp().json()
        .then(function(reqMirror) {
          assert.equal(reqMirror.url, '/v1/zapp');
        });
    });

    it('allows enabling keep-alive', function() {
      return myApi.with({
        rejectUnauthorized: false,
        keepAlive: true,
      }).zapp().json().then(function(reqMirror) {
        assert.equal(reqMirror.headers.connection, 'keep-alive');
      });
    });
  });

  describe('http', function() {
    var myApi = testServer.api().client;

    it('disables keep-alive by default', function() {
      return myApi.with({ rejectUnauthorized: false }).zapp().json()
        .then(function(reqMirror) {
          assert.equal(reqMirror.headers.connection, 'close');
        });
    });

    it('allows enabling keep-alive', function() {
      return myApi.with({
        rejectUnauthorized: false,
        keepAlive: true,
      }).zapp().json().then(function(reqMirror) {
        assert.equal(reqMirror.headers.connection, 'keep-alive');
      });
    });
  });
});
