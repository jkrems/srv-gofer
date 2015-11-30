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

describe('Gofer.defaults', function() {
  var myApi = testServer.api().client;

  it('global defaults can be overridden per service', function() {
    var instance = new myApi.constructor({
      globalDefaults: {
        a: 'global a',
        b: 'global b',
      },
      myApi: {
        a: 'specific a',
        c: 'specific c',
      },
    });
    assert.equal('service specific settings win',
      instance.defaults.a, 'specific a');
    assert.equal('global defaults apply when no specific value is available',
      instance.defaults.b, 'global b');
    assert.equal('when no global value exists, the specific value is taken',
      instance.defaults.c, 'specific c');
  });

  it('can create a copy with overrides', function() {
    var copy = myApi.with({ qs: { x: 'foo' }, appName: 'newApp' });
    assert.equal('Overrides original config in copy',
      copy.defaults.appName, 'newApp');
    assert.equal('Does not affect original instance',
      myApi.defaults.appName, 'myApp');
    assert.equal('Adds additional settings',
      copy.defaults.qs.x, 'foo');
  });

  describe('endpointDefaults', function() {
    var overrides = {
      endpointDefaults: {
        zapp: { headers: { 'X-Zapp-Only': 'special' } },
      },
    };

    it('apply to calls to the endpoint', function() {
      return myApi.with(overrides).zapp().json().then(function(reqMirror) {
        assert.equal('special', reqMirror.headers['x-zapp-only']);
      });
    });

    it('is ignored for other endpoints', function() {
      return myApi.with(overrides).query().json().then(function(reqMirror) {
        assert.equal(undefined, reqMirror.headers['x-zapp-only']);
      });
    });
  });
});
