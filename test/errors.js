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

var Gofer = require('../');

var testServer = require('./test-server');

function assertRejects(promise) {
  var unexpectedError = new Error('Expected to fail');
  return promise.then(function() {
    throw unexpectedError;
  }, function(error) {
    return error;
  });
}

function captureErrors(Type) {
  var errors = [];
  var emit = Type.prototype.emit;

  beforeEach('replace emit', function() {
    errors.length = 0;
    Type.prototype.emit = function patchedEmit(name, event) {
      if (name === 'error') {
        errors.push(event);
      }
      return emit.apply(this, arguments);
    };
  });

  afterEach('restore emit', function() {
    Type.prototype.emit = emit;
    errors.length = 0;
  });

  return errors;
}

describe('Error handling', function() {
  var myApi = testServer.api().client;

  describe('request-level error', function() {
    var errors = captureErrors(http.ClientRequest);

    it('is emitted for initial response timeout', function() {
      return assertRejects(myApi.fetch('/zapp', {
        qs: { __latency: 50 },
        timeout: 20,
      }).json()).then(function(error) {
        assert.equal('ETIMEDOUT', error.code);
        assert.equal('Emits the error on a response', error, errors[0]);
      });
    });

    it('is emitted for connect timeout', function() {
      return assertRejects(myApi.fetch({
        uri: 'http://10.255.255.1',
        timeout: 10 * 1000,
        connectTimeout: 20,
      }).json()).then(function(error) {
        assert.equal('ECONNECTTIMEDOUT', error.code);
        assert.equal('Emits the error on a request', error, errors[0]);
      });
    });

    it('is emitted for connect reset', function() {
      return assertRejects(myApi.crash().json())
        .then(function(error) {
          assert.equal('ECONNRESET', error.code);
          assert.equal('Emits the error on a request', error, errors[0]);
        });
    });
  });

  describe('response-level error', function() {
    var errors = captureErrors(http.IncomingMessage);

    it('is emitted for socket idle timeout', function() {
      return assertRejects(myApi.fetch('/zapp', {
        qs: { __delay: 50 },
        timeout: 20,
      }).json()).then(function(error) {
        assert.equal('ETIMEDOUT', error.code);
        assert.equal('Emits the error on a response', error, errors[0]);
      });
    });

    it('is emitted for JSON parse errors', function() {
      return assertRejects(myApi.fetch('/fail-json').json())
        .then(function(error) {
          assert.expect(error instanceof SyntaxError);
          assert.equal('{some-invalid-json}', error.source);
          assert.equal('Emits the error on a response', error, errors[0]);
        });
    });

    it('emits special error for 400/bad request', function() {
      return assertRejects(myApi.fail())
        .then(function(error) {
          var OUT_OF_RANGE = 'API Request returned a response outside the status code range (code: 400, range: [200, 299])';
          assert.equal(OUT_OF_RANGE, error.message);
          assert.equal(400, error.statusCode);
          assert.equal('Wrong URL', error.body.reason);
          assert.equal('Emits the error on a response', error, errors[0]);
          assert.expect('Is a Gofer.StatusCodeError',
            error instanceof Gofer.StatusCodeError);
          assert.expect('Is a Gofer.BadRequestError',
            error instanceof Gofer.BadRequestError);
          assert.truthy(error.headers);
        });
    });

    it('emits special error for 404/not-found', function() {
      return assertRejects(myApi.fetch('/not-found'))
        .then(function(error) {
          assert.equal(404, error.statusCode);
          assert.equal('Emits the error on a response', error, errors[0]);
          assert.expect('Is a Gofer.StatusCodeError',
            error instanceof Gofer.StatusCodeError);
          assert.expect('Is a Gofer.NotFoundError',
            error instanceof Gofer.NotFoundError);
        });
    });

    it('emits special error for 301/redirects', function() {
      return assertRejects(myApi.fetch('/redirect'))
        .then(function(error) {
          assert.equal(301, error.statusCode);
          assert.equal('Emits the error on a response', error, errors[0]);
          assert.expect('Is a Gofer.StatusCodeError',
            error instanceof Gofer.StatusCodeError);
          assert.expect('Is a Gofer.RedirectError',
            error instanceof Gofer.RedirectError);
        });
    });
  });
});
