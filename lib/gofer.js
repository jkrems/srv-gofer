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

var dns = require('dns');
var http = require('http');
var https = require('https');
var url = require('url');
var util = require('util');

function createRequestFromSRV_(protocolLib, options, resolve, reject) {
  function onResolved(error, results) {
    if (error) return reject(error);
    // TODO: Proper selection algorithm
    var address = results[0];
    options.hostname = address.name;
    options.port = address.port;

    var req = protocolLib.request(options);
    resolve(req);
  }
  var srvProtocol = options.protocol.slice(0, -1);
  // HACK: Default to mDNS-style
  var srvDomain = options.srvDomain || '._{protocol}._tcp.local.';
  var srvName = options.hostname + srvDomain.replace('{protocol}', srvProtocol);
  dns.resolveSrv(srvName, onResolved);
}

function createRequestFromSRV(protocolLib, options) {
  return new Promise(createRequestFromSRV_.bind(null, protocolLib, options));
}

var resProperties = {
  rawBody: {
    value: function rawBody() {
      var res = this;
      return new Promise(function _toPromise(resolve, reject) {
        var chunks = [];
        function addChunk(chunk) {
          chunks.push(chunk);
        }
        function concatChunks() {
          resolve(Buffer.concat(chunks));
        }
        res.on('error', reject);
        res.on('data', addChunk);
        res.on('end', concatChunks);
      });
    },
  },

  json: {
    value: function json() {
      return this.rawBody().then(function parseBody(rawBody) {
        return JSON.parse(rawBody.toString());
      });
    },
  },
};

function fetch_(options, resolve, reject) {
  if (typeof options === 'string') {
    options = url.parse(options);
    delete options.host;
    delete options.href;
  } else {
    options = util._extend({}, options);
  }

  var hostname = options.hostname;
  var setHost = options.setHost;
  options.setHost = false;

  var req_ = null;

  function failAndAbort(error) {
    if (req_ !== null) {
      req_.abort();
    }
    reject(error);
  }

  function handleResponse(res) {
    resolve(Object.defineProperties(res, resProperties));
  }

  function onRequest(req) {
    req_ = req;

    req.on('response', handleResponse);
    req.on('error', failAndAbort);

    if (!!setHost || setHost === undefined && !req.getHeader('Host')) {
      req.setHeader('Host', hostname);
    }

    req.end();
  }

  var isSRV = options.protocol.match(/^(https?)\+srv:$/);
  if (isSRV !== null) {
    options.protocol = isSRV[1] + ':';
  }
  var protocolLib = options.protocol === 'https:' ? https : http;

  if (isSRV) {
    createRequestFromSRV(protocolLib, options)
      .then(onRequest, failAndAbort);
  } else {
    onRequest(protocolLib.request(options));
  }
}

function _callJSON(res) {
  return res.json();
}

var reqProperties = {
  json: {
    value: function json() {
      return this.then(_callJSON);
    },
  },
};

function fetch(options) {
  var result = new Promise(fetch_.bind(null, options));
  return Object.defineProperties(result, reqProperties);
}

if (process.mainModule === module) {
  /* eslint no-console:0 */
  dns.setServers([ '127.0.0.1' ]);

  fetch(process.argv[2]).json()
    .then(function handleResponse(data) {
      console.log(data);
    }, function handleFailure(error) {
      console.log(error);
    });
}
