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

  it('makes no changes if pathParams is not an object', function() {
    return server.fetch({
      uri: '/first/{tag}',
      pathParams: 'else',
    }).json().then(function(reqMirror) {
      assert.equal('/first/{tag}', reqMirror.url);
    });
  });

  it('makes no changes with pathParams=null', function() {
    return server.fetch({
      uri: '/second/{tag}',
      pathParams: null,
    }).json().then(function(reqMirror) {
      assert.equal('/second/{tag}', reqMirror.url);
    });
  });

  it('makes no changes without a pathParams option', function() {
    return server.fetch({
      uri: '/third/{tag}',
    }).json().then(function(reqMirror) {
      assert.equal('/third/{tag}', reqMirror.url);
    });
  });

  it('replaces keys in baseUrl and uri', function() {
    return server.fetch({
      baseUrl: server.baseUrl + '/{country}/v2',
      uri: '/deals/{id}',
      pathParams: {
        country: 'us',
        id: 'half-off',
      },
    }).json().then(function(reqMirror) {
      assert.equal('/us/v2/deals/half-off', reqMirror.url);
    });
  });

  it('replaces duplicate keys', function() {
    return server.fetch({
      baseUrl: server.baseUrl + '/{country}/v2',
      uri: '/deals/{country}',
      pathParams: {
        country: 'us',
      },
    }).json().then(function(reqMirror) {
      assert.equal('/us/v2/deals/us', reqMirror.url);
    });
  });

  it('encodes values properly', function() {
    return server.fetch({
      uri: '/deals/{id}',
      pathParams: {
        id: '!@#',
      },
    }).json().then(function(reqMirror) {
      assert.equal('/deals/!%40%23', reqMirror.url);
    });
  });
});
