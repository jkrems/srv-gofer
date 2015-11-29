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

var merge = require('lodash.merge');

var fetch = require('./fetch');
var url = require('./url');

function Gofer(config) {
  config = config || {};
  var globalDefaults = config.globalDefaults || {};
  var serviceDefaults = config[this.serviceName] || {};
  this.defaults = merge({
    serviceName: this.serviceName,
    serviceVersion: this.serviceVersion,
  }, globalDefaults, serviceDefaults);
}
module.exports = Gofer;

Gofer.prototype.fetch = Gofer.prototype.get =
function defaultFetch(uri, options) {
  var overrides = url.toOptions(uri, options);
  return fetch(merge({}, this.defaults, overrides));
};

[ 'put', 'post', 'patch', 'del', 'head' ].forEach(function withVerb(verb) {
  var httpMethod = verb === 'del' ? 'DELETE' : verb.toUpperCase();
  Gofer.prototype[verb] =
  function fetchWithMethod(uri, options) {
    var overrides = url.toOptions(uri, options);
    return fetch(merge({}, this.defaults, { method: httpMethod }, overrides));
  };
});

Gofer.prototype.requestWithDefaults =
function requestWithDefaults(defaults) {
  var base = merge({}, this.defaults, defaults);
  return function request(uri, options) {
    var overrides = url.toOptions(uri, options);
    return fetch(merge({}, base, overrides));
  };
};

Gofer.prototype.registerEndpoint =
function registerEndpoint(name, endpointFn) {
  Object.defineProperty(this, name, {
    configurable: true,
    get: function _getCachedEndpoint() {
      var request = this.requestWithDefaults({ endpointName: name });
      var value = endpointFn(request);
      Object.defineProperty(this, name, { value: value });
      return value;
    },
  });
  return this;
};

Gofer.prototype.registerEndpoints =
function registerEndpoints(endpointMap) {
  Object.keys(endpointMap).forEach(function register(name) {
    this.registerEndpoint(name, endpointMap[name]);
  }, this);
  return this;
};
