crypto = require 'crypto'
http = require 'http'
qs = require 'querystring'

getStringToBeSigned = (params) ->
  keys = (k for k of params when k isnt 'h').sort()
  ("#{k}=#{params[k]}" for k in keys).join '&'

calcSignature = (params, key) ->
  hmac = crypto.createHmac 'sha1', new Buffer(key, 'base64').toString('binary')
  hmac.update getStringToBeSigned(params), 'binary'
  hmac.digest 'base64'

verifySignature = (params, key) -> 
  if calcSignature(params, key) is params.h
    'OK'
  else
    'BAD_SERVER_SIGNATURE' 
       
getRequestParams = (id, key, otp) ->
  params = 
    id: id
    otp: otp
    timestamp: 1
    nonce: crypto.randomBytes(16).toString 'hex'
    sl: 'secure'
  params.h = calcSignature params, key
  params

getResponseParams = (body) -> 
  qs.parse((line for line in body.split /\r\n/g when line isnt '').join('&'))

handleResponse = (body, key) ->
  params = getResponseParams body
  if params.status is 'OK'
    verifySignature params, key  
  else
    params.status

request = (url, done) ->
  body = []
  req = http.get url, (res) ->
    res.on 'data', (chunk) -> body.push chunk
    res.on 'end', () -> done null, res, body.join('')
  req.on 'error', (e) -> done e

verify = (hosts, path, timeoutMs, params, key, done) ->
  count = 0
  callbackCalled = false
  err = null

  setTimeout () -> 
    err = 'TIMEOUT'
    exit()
  , timeoutMs

  exit = () ->
    if not callbackCalled
      callbackCalled = true
      done err

  for host in hosts
    url = "http://#{host}/#{path}?#{qs.stringify(params)}"
    request url, (error, response, body) ->
      count++
      if error
        err = 'NETWORK_ERROR'
      else if response.statusCode is 200
        err = handleResponse body, key
        exit() if err is 'OK'
      else 
        err = 'HTTP_ERROR'

      if count is hosts.length
        exit()

class Verifier
  @HOSTS = [ 
    'api.yubico.com' 
    'api2.yubico.com'
    'api3.yubico.com'
    'api4.yubico.com'
    'api5.yubico.com'  
  ]
  @PATH = 'wsapi/2.0/verify'
  @ERRORS =
    'OK': 'The OTP is valid.'
    'BAD_OTP': 'The OTP has invalid format.'
    'REPLAYED_OTP': 'The OTP has already been seen by the validation service.'
    'BAD_SIGNATURE': 'The HMAC signature verification failed.'
    'MISSING_PARAMETER': 'Validation request lacks a parameter.'
    'NO_SUCH_CLIENT': 'Client id does not exist.'
    'OPERATION_NOT_ALLOWED': 'The request id is not allowed to verify OTPs.'
    'BACKEND_ERROR': '  Unexpected error in validation server.'
    'NOT_ENOUGH_ANSWERS': 'Validation server could not get requested number of syncs during before timeout.'
    'REPLAYED_REQUEST': 'Validation server has seen the OTP/Nonce combination before'
    'BAD_SERVER_SIGNATURE': 'Validation server responded with invalid signature'
    'TIMEOUT': 'Validation server took too long to respond'
    'NETWORK_ERROR': 'Network communication failed'
    'HTTP_ERROR': 'Server sent HTTP error code'

  constructor: (@apiId, @apiKey, @timeoutMs = 7000) ->

  errorMsg: (err) -> Verifier.ERRORS[err] or 'Unknown error'

  verify: (otp, done) ->
    params = getRequestParams @apiId, @apiKey, otp
    verify Verifier.HOSTS, Verifier.PATH, @timeoutMs, params, @apiKey, done

module.exports = Verifier

