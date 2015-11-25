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

var path = require('path');
var querystring = require('querystring');
var url = require('url');
var util = require('util');

var request = require('./request');

function parseUrl(uri) {
  var parsed = url.parse(uri, true);
  parsed.qs = parsed.query || {};
  delete parsed.query;
  delete parsed.host;
  delete parsed.href;
  delete parsed.path;
  delete parsed.hash;
  return parsed;
}

function applyBaseUrl(options, baseUrl) {
  // If the url already is absolute, baseUrl isn't needed.
  if (options.hostname) return;

  var parsed = parseUrl(baseUrl, true);

  // Protocol, hostname, and port always apply
  options.protocol = parsed.protocol;
  options.hostname = parsed.hostname;
  options.port = parsed.port;

  // For the pathname, we join. E.g. http://host/v2 + /my-resource
  options.pathname = path.join(parsed.pathname || '/', options.pathname || '/');

  // Auth applies if the options didn't already specify it.
  options.auth = options.auth || parsed.auth;

  // Explicit query overrides base url query
  util._extend(parsed.qs, options.qs);
}

function generateSearch(query) {
  var queryKeys = Object.keys(query);
  if (queryKeys.length === 0) {
    return '';
  }
  return '?' + querystring.stringify(query);
}

function parseAndExtend(uri, options) {
  var parsed = parseUrl(uri);
  var qs = util._extend(parsed.qs, options.qs || {});
  util._extend(parsed, options);
  parsed.qs = qs;
  return parsed;
}

function unifyAuth(auth) {
  if (typeof auth === 'string') return auth;
  if (!auth) return null;
  if (typeof auth !== 'object') {
    throw new TypeError('Invalid auth option ' + typeof auth);
  }
  var user = auth.user || auth.username;
  var pass = auth.pass || auth.password;
  if (typeof user !== 'string' || typeof pass !== 'string') {
    throw new TypeError('Auth has to be a user/pass pair');
  }
  return user + ':' + pass;
}

function validateProtocol(options) {
  var protocol = options.protocol;
  options.isSRV = protocol === 'http+srv:' || protocol === 'https+srv:';
  if (options.isSRV) {
    options.protocol = protocol.slice(0, -5) + ':';
  }
}

function fetch(uri, options) {
  if (typeof uri === 'string') {
    options = parseAndExtend(uri, options || {});
  } else if (uri && typeof uri === 'object') {
    options = util._extend({ qs: {}, headers: {} }, uri);
  } else {
    throw new TypeError('Invalid uri ' + typeof uri);
  }

  if (options.baseUrl) {
    applyBaseUrl(options, options.baseUrl);
  }

  validateProtocol(options);

  return request({
    isSRV: options.isSRV,
    protocol: options.protocol,
    hostname: options.hostname || options.host || 'localhost',
    port: options.port,
    method: options.method || 'GET',
    path: options.pathname + generateSearch(options.qs),
    headers: options.headers,
    auth: unifyAuth(options.auth),
  });
}
module.exports = fetch;