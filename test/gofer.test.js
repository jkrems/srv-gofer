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

var testServer = require('./test-server');

describe('Gofer', function() {
  var server = testServer.api();

  it('has a client', function() {
    assert.truthy(server.client);
  });
});

//   before (done) ->
//     server = http.createServer (req, res) ->
//       {url, method, headers} = req
//       if Url.parse(url).pathname == '/v1/zapp'
//         res.writeHead 200, 'Content-Type': 'application/json'
//         chunks = []
//         req.on 'data', (chunk) -> chunks.push chunk
//         req.on 'end', ->
//           body = Buffer.concat(chunks).toString 'utf8'
//           res.end JSON.stringify {url, method, headers, body}
//       else if url == '/v1/crash'
//         res.socket.destroy()
//       else if url == '/v1/fail-json'
//         res.writeHead 200, 'Content-Type': 'application/json'
//         res.end '{some-invalid-json}'
//       else
//         res.writeHead 404, 'Content-Type': 'application/json'
//         res.end JSON.stringify { message: 'not found' }

//     server.listen 0, ->
//       {port} = @address()
//       defaultConfig.myApi.baseUrl = "http://127.0.0.1:#{port}/v1"
//       done()

//   after (done) ->
//     if server?
//       try server.close()
//     done()

//   beforeEach ->
//     myApi = new MyApi defaultConfig

//   it 'reacts properly to low-level errors', (done) ->
//     req = myApi.crash (err, data, response, responseData) ->
//       assert.equal 'socket hang up', err?.message
//       done()

//   it 'passes through errors', (done) ->
//     req = myApi.fail (err, data, response, responseData) ->
//       OUT_OF_RANGE = 'API Request returned a response outside the status code range (code: 404, range: [200, 299])'
//       assert.equal OUT_OF_RANGE, err?.message
//       assert.equal 'not found', data?.message
//       done()

//   it 'passes through errors with old hub', (done) ->
//     api = new MyApi defaultConfig
//     expectedErr = new Error 'Original fetch error'
//     expectedMeta = { some: 'stats' }
//     expectedResponse =
//       statusCode: 404
//       headers: { 'content-type': 'application/json' }
//     # simulate pre-2.3.0 hub
//     api.hub = {
//       fetch: (options, cb) ->
//         cb expectedErr, '{"raw":"json"}', expectedResponse, expectedMeta
//     }
//     api.fail (err, data, meta, response) ->
//       assert.deepEqual { raw: 'json' }, data
//       assert.equal expectedMeta, meta
//       assert.equal expectedResponse, response
//       assert.equal expectedErr, err
//       done()

//   it 'does not swallow query parameters', (done) ->
//     req = myApi.query (err, reqMirror) ->
//       assert.equal undefined, err?.stack
//       assert.equal '/v1/zapp?p=1', reqMirror.url
//       done()

//   it 'does not send undefined/null query parameters', (done) ->
//     req = myApi.undef (err, reqMirror) ->
//       assert.equal undefined, err?.stack
//       assert.equal '/v1/zapp?c=non-null', reqMirror.url
//       done()

//   it 'does not send undefined/null headers', (done) ->
//     req = myApi.undefHeaders (err, reqMirror) ->
//       assert.equal undefined, err?.stack
//       assert.equal undefined, reqMirror.headers.a
//       assert.equal undefined, reqMirror.headers.b
//       assert.equal 'non-null', reqMirror.headers.c
//       done()

//   it 'fails early when an invalid timeout value is passed', ->
//     err = assert.throws -> myApi.fetch { timeout: '100', uri: '/' }
//     assert.equal 'Invalid timeout: "100", not a number', err.message
//     err = assert.throws -> myApi.fetch { connectTimeout: false, uri: '/' }
//     assert.equal 'Invalid timeout: false, not a number', err.message

//   it 'passes back JSON parsing error & original string', (done) ->
//     req = myApi.failJSON (err, reqMirror) ->
//       assert.equal true, err instanceof SyntaxError
//       assert.equal '{some-invalid-json}', reqMirror
//       done()

//   describe 'special characters', ->
//     it 'are supported in form payloads', (done) ->
//       req = myApi.fetch {
//         uri: '/zapp'
//         method: 'POST'
//         form: { x: '💩' }
//       }, (err, reqMirror) ->
//         return done(err) if err?
//         body = parseQS reqMirror.body
//         assert.equal '💩', body.x
//         assert.equal '''
//           application/x-www-form-urlencoded; charset=utf-8
//         ''', reqMirror.headers['content-type']
//         done()

//     it 'allows yolo-mode for form charsets', (done) ->
//       req = myApi.fetch {
//         uri: '/zapp'
//         method: 'POST'
//         forceFormEncoding: false
//         form: { x: '💩' }
//       }, (err, reqMirror) ->
//         return done(err) if err?
//         body = parseQS reqMirror.body
//         assert.equal '💩', body.x
//         assert.equal '''
//           application/x-www-form-urlencoded
//         ''', reqMirror.headers['content-type']
//         done()

//     it 'are supported in json payloads', (done) ->
//       req = myApi.fetch {
//         uri: '/zapp'
//         method: 'POST'
//         json: { x: '💩' }
//       }, (err, reqMirror) ->
//         return done(err) if err?
//         body = JSON.parse reqMirror.body
//         assert.equal '💩', body.x
//         done()

//   ['put','post','patch','del','head','get'].forEach (verb) ->
//     httpMethod = verb.toUpperCase()
//     httpMethod = 'DELETE' if verb == 'del'

//     it "offers a convenience way to do a #{httpMethod}-request", (done) ->
//       req = myApi[verb] '/zapp', (err, reqMirror) ->
//         assert.equal undefined, err?.stack
//         assert.equal '/v1/zapp', req.uri.pathname
//         assert.equal httpMethod, req.method
//         assert.equal undefined, req.endpointName
//         assert.equal 'myApi', req.serviceName
//         assert.equal httpMethod.toLowerCase(), req.methodName
//         done()

//   it 'makes a request', (done) ->
//     req = myApi.zapp (err, reqMirror) ->
//       assert.equal undefined, err?.stack
//       assert.equal '/v1/zapp', reqMirror.url
//       assert.hasType String, reqMirror.headers['x-fetch-id']
//       assert.equal 'sneaky header', reqMirror.headers['x-sneaky']

//       userAgent = reqMirror.headers['user-agent']
//       assert.equal 'myApi/1.0.0 (myApp/mySha; noFQDN)', userAgent

//       done()

//     req.headers['x-sneaky'] = 'sneaky header'

//   it 'is not bothered by a weird baseUrl option', (done) ->
//     options =
//       uri: '/zapp'
//       baseUrl:
//         real: defaultConfig.myApi.baseUrl
//         fake: 'http://invalid.url'

//     myApi.clearOptionMappers()
//     myApi.addOptionMapper (opts) ->
//       # oops, forgot to delete opts.baseUrl
//       @applyBaseUrl opts.baseUrl.real, opts

//     req = myApi.fetch options, (err, reqMirror) ->
//       assert.equal undefined, err?.stack
//       assert.equal '/v1/zapp', reqMirror.url
//       done()

