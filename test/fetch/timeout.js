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

var Gofer = require('../..');

var testServer = require('../test-server');

function assertRejects(promise) {
  var unexpectedError = new Error('Expected to fail');
  return promise.then(function() {
    throw unexpectedError;
  }, function(error) {
    return error;
  });
}

describe('fetch/auth', function() {
  var server = testServer.echo();

  describe('connect timeout', function() {
    it('fails when the connect timeout is exceeded', function() {
      this.timeout(500);
      return assertRejects(Gofer.fetch({
        uri: 'http://10.255.255.1',
        timeout: 10 * 1000,
        connectTimeout: 50,
      })).then(function(error) {
        assert.equal('ECONNECTTIMEDOUT', error.code);
        assert.equal(50, error.connectTimeout);
        assert.hasType(Number, error.timing.socket);
      });
    });
  });

  describe('response timeout', function() {
    it('does not pass an error when timeout is not exceeded', function() {
      return server.fetch({
        qs: { __latency: 20 },
        timeout: 50,
      });
    });

    it('passes an error when timeout is exceeded', function() {
      return assertRejects(server.fetch('/', {
        qs: { __latency: 50 },
        timeout: 20,
      })).then(function(error) {
        assert.equal('ETIMEDOUT', error.code);
      });
    });
  });

  describe('socket timeout', function() {
    it('does not pass an error when timeout is not exceeded', function() {
      return server.fetch({
        qs: { __delay: 20 },
        timeout: 50,
      });
    });

    it('succeeds if the response was received', function() {
      return server.fetch('/', {
        qs: { __delay: 50 },
        timeout: 20,
      }).then(function(res) {
        return assertRejects(res.rawBody());
      });
    });

    it('passes an error when reading the response body', function() {
      return assertRejects(server.fetch('/', {
        qs: { __delay: 50 },
        timeout: 20,
      }).json()).then(function(error) {
        assert.equal('ETIMEDOUT', error.code);
      });
    });
  });

  describe('combined timeouts', function() {
    it('does not pass an error when timeout and completion timeouts are not exceeded', function() {
      return server.fetch({
        qs: { __latency: 10, __delay: 10 },
        timeout: 50,
        connectTimeout: 50,
      });
    });

    it('passes an error when completion is exceeded', function() {
      return assertRejects(server.fetch({
        qs: { __delay: 50 },
        timeout: 20,
        connectTimeout: 20,
      }).json()).then(function(error) {
        assert.equal('ETIMEDOUT', error.code);
      });
    });

    it('passes an error when connection is exceeded', function() {
      return assertRejects(server.fetch({
        uri: 'http://10.255.255.1',
        timeout: 10000,
        connectTimeout: 1,
      })).then(function(error) {
        assert.equal('ECONNECTTIMEDOUT', error.code);
      });
    });

    it('passes an error when timeout is exceeded', function() {
      return assertRejects(server.fetch({
        qs: { __latency: 30, __delay: 30 },
        timeout: 1,
        connectTimeout: 30,
      })).then(function(error) {
        assert.equal('ETIMEDOUT', error.code);
      });
    });
  });
});
