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
var url = require('url');

var assign = require('lodash.assign');
var qsParser = require('qs');

function parseUrl(uri) {
  var parsed = url.parse(uri);
  return {
    protocol: parsed.protocol,
    auth: parsed.auth,
    hostname: parsed.hostname,
    port: parsed.port,
    pathname: parsed.pathname,
    qs: qsParser.parse(parsed.query || ''),
  };
}
exports.parse = parseUrl;

function parseAndExtend(uri, options) {
  var parsed = parseUrl(uri);
  var qs = assign(parsed.qs, options.qs || {});
  assign(parsed, options);
  parsed.qs = qs;
  return parsed;
}
exports.parseAndExtend = parseAndExtend;

function toOptions(uri, options) {
  if (typeof uri === 'string') {
    options = parseAndExtend(uri, options || {});
  } else if (uri && typeof uri === 'object') {
    options = assign({ qs: {}, headers: {} }, uri);
    if ('uri' in options) {
      options = parseAndExtend(options.uri, options);
      delete options.uri;
    }
  } else {
    throw new TypeError('Invalid uri ' + typeof uri);
  }
  return options;
}
exports.toOptions = toOptions;

function applyBaseUrl(options, baseUrl) {
  // If the url already is absolute, baseUrl isn't needed.
  if (options.hostname) return;

  var parsed = parseUrl(baseUrl);

  // Protocol, hostname, and port always apply
  options.protocol = parsed.protocol;
  options.hostname = parsed.hostname;
  options.port = parsed.port;

  // For the pathname, we join. E.g. http://host/v2 + /my-resource
  options.pathname = path.join(parsed.pathname || '/', options.pathname || '/');

  // Auth applies if the options didn't already specify it.
  options.auth = options.auth || parsed.auth;

  // Explicit query overrides base url query
  assign(parsed.qs, options.qs);
}
exports.applyBaseUrl = applyBaseUrl;

function replacePathParams(options) {
  var pathname = options.pathname;
  var pathParams = options.pathParams;
  if (!pathParams || typeof pathParams !== 'object') {
    return pathname;
  }

  var tags = Object.keys(pathParams);
  if (tags.length < 1) return pathname;

  function addTag(acc, tag) {
    var value = pathParams[tag];
    var encoded = encodeURIComponent(value);
    var wrappedTag = '{' + tag + '}';
    var encodedWrapped = '%7B' + tag + '%7D';
    acc[wrappedTag] = acc[encodedWrapped] = encoded;
    return acc;
  }

  var wrappedPathParams = tags.reduce(addTag, {});
  var wrappedTags = Object.keys(wrappedPathParams);

  var regex = new RegExp(wrappedTags.join('|'), 'g');
  function replaceParam(match) {
    return wrappedPathParams[match];
  }
  return pathname.replace(regex, replaceParam);
}
exports.replacePathParams = replacePathParams;

exports.format = url.format;
