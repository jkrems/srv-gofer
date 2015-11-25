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

var testServer = require('../test-server');

describe('fetch/json', function() {
  var server = testServer.echo();

  it('can send `true` as JSON', function() {
    return server.fetch('/', {
      method: 'POST',
      json: true,
    }).json().then(function(echo) {
      assert.equal('true', echo.body);
      assert.equal('4', echo.headers['content-length']);
      assert.equal('application/json', echo.headers['content-type']);
    });
  });

  it('can send objects as JSON', function() {
    var payload = { x: '💩' };
    var serialized = '{"x":"💩"}';
    return server.fetch('/', {
      method: 'POST',
      json: payload,
    }).json().then(function(echo) {
      assert.deepEqual(payload, JSON.parse(echo.body));
      assert.equal(serialized, echo.body);
      assert.expect('it\'s not naïve string length',
        serialized.length < +echo.headers['content-length']);
      assert.equal('12', echo.headers['content-length']);
      assert.equal('application/json', echo.headers['content-type']);
    });
  });

  it('throws immediately if the value cannot be serialized', function() {
    var obj = {};
    obj.cycle = obj;

    var error = assert.throws(function() {
      server.fetch('/', { method: 'POST', json: obj });
    });
    assert.include('circular structure', error.message);
  });
});
