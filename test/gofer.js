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
var parseQS = require('qs').parse;

var testServer = require('./test-server');

function assertRejects(promise) {
  var unexpectedError = new Error('Expected to fail');
  return promise.then(function() {
    throw unexpectedError;
  }, function(error) {
    return error;
  });
}

describe('Gofer', function() {
  var myApi = testServer.api().client;

  it('does not swallow query parameters', function() {
    return myApi.query().json()
      .then(function(reqMirror) {
        assert.equal('/v1/zapp?p=1', reqMirror.url);
      });
  });

  it('does not send undefined/null query parameters', function() {
    return myApi.undef().json()
      .then(function(reqMirror) {
        assert.equal('/v1/zapp?c=non-null', reqMirror.url);
      });
  });

  it('does not send undefined/null headers', function() {
    return myApi.undefHeaders().json()
      .then(function(reqMirror) {
        assert.equal(undefined, reqMirror.headers.a);
        assert.equal(undefined, reqMirror.headers.b);
        assert.equal('non-null', reqMirror.headers.c);
      });
  });

  it('fails early when an invalid timeout value is passed', function() {
    var error = assert.throws(function() { myApi.fetch({ timeout: '100' }); });
    assert.equal('Invalid timeout "100", not a number', error.message);
    error = assert.throws(function() { myApi.fetch({ connectTimeout: false }); });
    assert.equal('Invalid timeout false, not a number', error.message);
  });

  it('passes back JSON parsing error & original string', function() {
    return assertRejects(myApi.failJSON().json())
      .then(function(error) {
        assert.expect(error instanceof SyntaxError);
        assert.equal('{some-invalid-json}', error.source);
      });
  });

  describe('special characters', function() {
    it('are supported in form payloads', function() {
      return myApi.fetch({
        uri: '/zapp',
        method: 'POST',
        form: { x: '💩' },
      }).json().then(function(reqMirror) {
        var body = parseQS(reqMirror.body);
        assert.equal('💩', body.x);
        assert.equal(
          'application/x-www-form-urlencoded',
          reqMirror.headers['content-type']);
      });
    });

    it('allows custom content type headers', function() {
      return myApi.fetch({
        uri: '/zapp',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
        },
        form: { x: '💩' },
      }).json().then(function(reqMirror) {
        var body = parseQS(reqMirror.body);
        assert.equal('💩', body.x);
        assert.equal(
          'application/x-www-form-urlencoded; charset=utf-8',
          reqMirror.headers['content-type']);
      });
    });

    it('are supported in json payloads', function() {
      return myApi.fetch({
        uri: '/zapp',
        method: 'POST',
        json: { x: '💩' },
      }).json().then(function(reqMirror) {
        var body = JSON.parse(reqMirror.body);
        assert.equal('💩', body.x);
      });
    });
  });

  [ 'put', 'post', 'patch', 'del', 'get', 'head' ].forEach(function(verb) {
    var httpMethod = verb === 'del' ? 'DELETE' : verb.toUpperCase();

    it('offers a convenience way to do a ' + httpMethod, function() {
      return myApi[verb]('/zapp').rawBody().then(function(body) {
        if (verb === 'head') {
          assert.equal('', body.toString());
        } else {
          var reqMirror = JSON.parse(body.toString());
          assert.equal(httpMethod, reqMirror.method);
        }
      });
    });
  });

  it('ignores non-string baseUrl options', function() {
    var options = {
      uri: '/zapp',
      baseUrl: {
        real: myApi.defaults.baseUrl,
        fake: 'http://invalid.url',
      },
    };

    var error = assert.throws(function() { myApi.fetch(options); });
    assert.equal('Invalid URI "/zapp"', error.message);
  });

  it('includes a default user-agent', function() {
    return myApi.zapp().json()
      .then(function(reqMirror) {
        var userAgent = reqMirror.headers['user-agent'];
        assert.equal('myApi/1.0.0 (myApp/mySha; noFQDN)', userAgent);
      });
  });
});
