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

var util = require('util');

var assert = require('assertive');

var testServer = require('./test-server');

describe('Option mappers', function() {
  var myApi = testServer.api().client;
  var withMapper;

  beforeEach('add global option mapper', function() {
    function Derived(options) {
      myApi.constructor.call(this, options);
    }
    util.inherits(Derived, myApi.constructor);
    withMapper = new Derived({ globalDefaults: myApi.defaults });

    Derived.prototype.addOptionMapper(function(options) {
      options.headers = options.headers || {};
      options.headers['x-from-mapper'] = 'present';
      options.headers['x-in-order'] = '1';
      return options;
    });

    Derived.prototype.addOptionMapper(function(options) {
      options.headers = options.headers || {};
      options.headers['x-in-order'] = '2';
      return options;
    });
  });

  it('runs the option mappers for instances of derived', function() {
    return withMapper.zapp().json().then(function(reqMirror) {
      assert.equal('present', reqMirror.headers['x-from-mapper']);
      assert.equal('2', reqMirror.headers['x-in-order']);
    });
  });

  it('does not run the option mappers for the base class', function() {
    return myApi.zapp().json().then(function(reqMirror) {
      assert.equal(undefined, reqMirror.headers['x-from-mapper']);
      assert.equal(undefined, reqMirror.headers['x-in-order']);
    });
  });

  describe('with local option mapper', function() {
    var withLocalMapper;

    beforeEach('add local mapper', function() {
      withLocalMapper = withMapper.clone();
      withLocalMapper.addOptionMapper(function(options) {
        options.headers['x-from-local-mapper'] = 'local';
        options.headers['x-in-order'] = '3';
      });
    });

    it('affects the current instance', function() {
      return withLocalMapper.zapp().json().then(function(reqMirror) {
        assert.equal('present', reqMirror.headers['x-from-mapper']);
        assert.equal('local', reqMirror.headers['x-from-local-mapper']);
        assert.equal('3', reqMirror.headers['x-in-order']);
      });
    });

    it('does not affect other instances', function() {
      return withMapper.zapp().json().then(function(reqMirror) {
        assert.equal('present', reqMirror.headers['x-from-mapper']);
        assert.equal(undefined, reqMirror.headers['x-from-local-mapper']);
        assert.equal('2', reqMirror.headers['x-in-order']);
      });
    });
  });
});
