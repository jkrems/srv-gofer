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

var fs = require('fs');

var assert = require('assertive');

var express = require('express');
var compression = require('compression');

var testServer = require('../test-server');

var LICENSE = fs.readFileSync('LICENSE', 'utf8');

function unexpected() {
  throw new Error('Unexpected success');
}

describe('fetch/gzip', function() {
  var app = express();
  app.get('/gzip', compression(), function(req, res) {
    res.json({
      ok: true,
      headers: req.headers,
      // This ensures we actually do compression
      padding: [
        LICENSE, LICENSE, LICENSE, LICENSE, LICENSE,
        LICENSE, LICENSE, LICENSE, LICENSE, LICENSE,
      ],
    });
  });
  app.get('/invalid-gzip', function(req, res) {
    res.setHeader('Content-Encoding', 'gzip');
    res.end('Totally not GZIP');
  });
  var server = testServer.create(app);

  it('works with gzip', function() {
    return server.fetch('/gzip')
      .then(function(res) {
        return res.json().then(function(echo) {
          // Step 1: We triggered compression
          assert.equal('gzip', res.headers['content-encoding']);

          // Step 2: We can actually understand the compressed data
          assert.equal(true, echo.ok);
          assert.equal('gzip', echo.headers['accept-encoding']);
        });
      });
  });

  it('fails on invalid gzip', function() {
    return server.fetch('/invalid-gzip')
      .then(function(res) {
        return res.json().then(unexpected, function(error) {
          assert.equal('incorrect header check', error.message);
        });
      });
  });
});
