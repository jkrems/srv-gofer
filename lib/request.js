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
var https = require('https');

var resProperties = require('./response-proto');
var reqProperties = require('./request-proto');
var createRequestFromSRV = require('./srv');

function request_(options, resolve, reject) {
  var hostname = options.hostname;
  var setHost = options.setHost;
  options.setHost = false;

  var req_ = null;

  function failAndAbort(error) {
    if (req_ !== null) {
      req_.abort();
      req_ = null;
    }
    reject(error);
  }

  function handleResponse(res) {
    resolve(Object.defineProperties(res, resProperties));
  }

  function onRequest(req) {
    req_ = req;

    req.once('response', handleResponse);
    req.once('error', failAndAbort);

    if (!!setHost || setHost === undefined && !req.getHeader('Host')) {
      req.setHeader('Host', hostname);
    }

    var body = options.body;

    if (body === undefined) {
      req.end();
    } else if (typeof body === 'string' || Buffer.isBuffer(body)) {
      req.end(body);
    } else if (body && typeof body.pipe === 'function') {
      body.pipe(req);
    } else {
      throw new TypeError('Invalid body ' + typeof body);
    }
  }

  var protocolLib = options.protocol === 'https:' ? https : http;

  if (options.isSRV) {
    createRequestFromSRV(protocolLib, options)
      .then(onRequest, failAndAbort);
  } else {
    onRequest(protocolLib.request(options));
  }
}

function request(options) {
  var result = new Promise(request_.bind(null, options));
  return Object.defineProperties(result, reqProperties);
}
module.exports = request;
