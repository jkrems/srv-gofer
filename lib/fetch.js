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

var qsParser = require('qs');
var util = require('util');

var assign = require('lodash.assign');

var request = require('./request');
var url = require('./url');

var DEFAULT_CONNECT_TIMEOUT = 1000;
var DEFAULT_TIMEOUT = 10 * 1000;

function generateSearch(query) {
  var filtered = {};
  var queryKeys = Object.keys(query)
    .filter(function ensureSet(key) {
      var value = query[key];
      var isSet = value !== null && value !== undefined;
      if (isSet) {
        filtered[key] = value;
      }
      return isSet;
    });

  if (queryKeys.length === 0) return '';
  return '?' + qsParser.stringify(filtered);
}

function filterHeaders(headers) {
  var filtered = {};
  Object.keys(headers).forEach(function ensureSet(name) {
    var value = headers[name];
    if (value !== null && value !== undefined) {
      filtered[name] = headers[name];
    }
  });
  return filtered;
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

function buildUserAgent(options) {
  return (
    (options.serviceName || 'noServiceName') + '/' +
    (options.serviceVersion || 'noServiceVersion') + ' (' +
    (options.appName || 'noAppName') + '/' +
    (options.appSha || 'noAppSha') + '; ' +
    (options.fqdn || 'noFQDN') + ')'
  );
}

function validateProtocol(options) {
  var protocol = options.protocol;
  options.isSRV = protocol === 'http+srv:' || protocol === 'https+srv:';
  if (options.isSRV) {
    options.protocol = protocol.slice(0, -5) + ':';
  }
}

function isValidBody(body) {
  return body === undefined ||
    Buffer.isBuffer(body) || typeof body === 'string' ||
    (body && typeof body.pipe === 'function');
}

function validateBody(body) {
  if (!isValidBody) {
    throw new TypeError('Invalid body ' + typeof body);
  }
  return body;
}

function defaultTimeout(value, defaultValue) {
  if (value >= 0) {
    if (typeof value !== 'number') {
      throw new TypeError(util.format(
        'Invalid timeout %j, not a number', value));
    }
    return value;
  }
  return defaultValue;
}

function fetch(options) {
  if (options.baseUrl && typeof options.baseUrl === 'string') {
    url.applyBaseUrl(options, options.baseUrl);
  }

  validateProtocol(options);

  var defaultHeaders = {
    'Accept-Encoding': 'gzip',
    'User-Agent': buildUserAgent(options),
  };
  var body = validateBody(options.body);
  var json = options.json;
  var form = options.form;

  if (json !== undefined && json !== null) {
    defaultHeaders['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (form !== undefined && form !== null) {
    if (typeof form !== 'object') {
      throw new TypeError(
        'Invalid form body (' + typeof form + ', expected object)');
    }
    defaultHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
    body = qsParser.stringify(form);
  }

  var hostname = options.hostname || options.host;
  if (!hostname || typeof hostname !== 'string') {
    throw new Error(util.format('Invalid URI %j', url.format(options)));
  }

  return request({
    isSRV: options.isSRV,
    protocol: options.protocol,
    hostname: hostname,
    port: options.port,
    method: options.method || 'GET',
    path: options.pathname + generateSearch(options.qs),
    headers: filterHeaders(assign(defaultHeaders, options.headers)),
    auth: unifyAuth(options.auth),
    localAddress: options.localAddress,
    body: body,
    connectTimeout: defaultTimeout(options.connectTimeout, DEFAULT_CONNECT_TIMEOUT),
    timeout: defaultTimeout(options.timeout, DEFAULT_TIMEOUT),
    minStatusCode: options.minStatusCode || 200,
    maxStatusCode: options.maxStatusCode || 299,
  });
}
module.exports = fetch;
