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
var util = require('util');

var resProperties = require('./response-proto');
var reqProperties = require('./request-proto');
var createRequestFromSRV = require('./srv');

function request_(options, resolve, reject) {
  var hostname = options.hostname;
  var setHost = options.setHost;
  options.setHost = false;

  var req_ = null;
  var res_ = null;
  var connectTimer = null;
  var responseTimer = null;

  var startTime = Date.now();
  var timing = {
    socket: null,
    connect: null,
    headers: null,
  };

  function failAndAbort(error) {
    clearTimeout(connectTimer);
    connectTimer = null;
    clearTimeout(responseTimer);
    responseTimer = null;

    if (req_ !== null) {
      req_.abort();
      req_ = null;
    }

    if (res_) {
      res_.emit('error', error);
    } else {
      reject(error);
    }
  }

  function isAcceptableStatus(code) {
    return code >= options.minStatusCode && code <= options.maxStatusCode;
  }

  function generateStatusCodeError() {
    var error = new Error(util.format(
      'API Request returned a response outside the status code range (code: %s, range: [%s, %s])',
      res_.statusCode, options.minStatusCode, options.maxStatusCode));
    error.statusCode = res_.statusCode;
    error.minStatusCode = options.minStatusCode;
    error.maxStatusCode = options.maxStatusCode;
    res_.parsedBody()
      .then(null, function defaultBody() { return '(could not parse body)'; })
      .then(function rejectWithBody(body) {
        error.body = body;
        reject(error);
      });
  }

  function handleResponse(res) {
    clearTimeout(responseTimer);
    responseTimer = null;

    timing.headers = Date.now() - startTime;

    res_ = Object.defineProperties(res, resProperties);

    if (!isAcceptableStatus(res.statusCode)) {
      generateStatusCodeError();
    } else {
      resolve(res_);
    }
  }

  function onResponseTimedOut() {
    var error = new Error('Fetching from ' + hostname + ' timed out');
    error.code = 'ETIMEDOUT';
    error.timeout = options.timeout;
    error.timing = timing;
    failAndAbort(error);
  }

  function onConnectTimedOut() {
    var error = new Error('Connection to ' + hostname + ' timed out');
    error.code = 'ECONNECTTIMEDOUT';
    error.connectTimeout = options.connectTimeout;
    error.timing = timing;
    failAndAbort(error);
  }

  function onConnect() {
    timing.connect = Date.now() - startTime;
    clearTimeout(connectTimer);
    connectTimer = null;
  }

  function onSocket(socket) {
    timing.socket = Date.now() - startTime;
    connectTimer = setTimeout(onConnectTimedOut, options.connectTimeout);
    socket.once('connect', onConnect);

    responseTimer = setTimeout(onResponseTimedOut, options.timeout);
    socket.setTimeout(options.timeout, onResponseTimedOut);
  }

  function onRequest(req) {
    req_ = req;

    req.once('response', handleResponse);
    req.once('error', failAndAbort);
    req.once('socket', onSocket);

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
