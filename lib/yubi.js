(function() {
  var Verifier, calcSignature, crypto, getRequestParams, getResponseParams, getStringToBeSigned, handleResponse, http, qs, request, verify, verifySignature;

  crypto = require('crypto');

  http = require('http');

  qs = require('querystring');

  getStringToBeSigned = function(params) {
    var k, keys;

    keys = ((function() {
      var _results;

      _results = [];
      for (k in params) {
        if (k !== 'h') {
          _results.push(k);
        }
      }
      return _results;
    })()).sort();
    return ((function() {
      var _i, _len, _results;

      _results = [];
      for (_i = 0, _len = keys.length; _i < _len; _i++) {
        k = keys[_i];
        _results.push("" + k + "=" + params[k]);
      }
      return _results;
    })()).join('&');
  };

  calcSignature = function(params, key) {
    var hmac;

    hmac = crypto.createHmac('sha1', new Buffer(key, 'base64').toString('binary'));
    hmac.update(getStringToBeSigned(params), 'binary');
    return hmac.digest('base64');
  };

  verifySignature = function(params, key) {
    if (calcSignature(params, key) === params.h) {
      return 'OK';
    } else {
      return 'BAD_SERVER_SIGNATURE';
    }
  };

  getRequestParams = function(id, key, otp) {
    var params;

    params = {
      id: id,
      otp: otp,
      timestamp: 1,
      nonce: crypto.randomBytes(16).toString('hex'),
      sl: 'secure'
    };
    params.h = calcSignature(params, key);
    return params;
  };

  getResponseParams = function(body) {
    var line;

    return qs.parse(((function() {
      var _i, _len, _ref, _results;

      _ref = body.split(/\r\n/g);
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        line = _ref[_i];
        if (line !== '') {
          _results.push(line);
        }
      }
      return _results;
    })()).join('&'));
  };

  handleResponse = function(body, key) {
    var params;

    params = getResponseParams(body);
    if (params.status === 'OK') {
      return verifySignature(params, key);
    } else {
      return params.status;
    }
  };

  request = function(url, done) {
    var body, req;

    body = [];
    req = http.get(url, function(res) {
      res.on('data', function(chunk) {
        return body.push(chunk);
      });
      return res.on('end', function() {
        return done(null, res, body.join(''));
      });
    });
    return req.on('error', function(e) {
      return done(e);
    });
  };

  verify = function(hosts, path, timeoutMs, params, key, done) {
    var callbackCalled, count, err, exit, host, url, _i, _len, _results;

    count = 0;
    callbackCalled = false;
    err = null;
    setTimeout(function() {
      err = 'TIMEOUT';
      return exit();
    }, timeoutMs);
    exit = function() {
      if (!callbackCalled) {
        callbackCalled = true;
        return done(err);
      }
    };
    _results = [];
    for (_i = 0, _len = hosts.length; _i < _len; _i++) {
      host = hosts[_i];
      url = "http://" + host + "/" + path + "?" + (qs.stringify(params));
      _results.push(request(url, function(error, response, body) {
        count++;
        if (error) {
          err = 'NETWORK_ERROR';
        } else if (response.statusCode === 200) {
          err = handleResponse(body, key);
          if (err === 'OK') {
            exit();
          }
        } else {
          err = 'HTTP_ERROR';
        }
        if (count === hosts.length) {
          return exit();
        }
      }));
    }
    return _results;
  };

  Verifier = (function() {
    Verifier.HOSTS = ['api.yubico.com', 'api2.yubico.com', 'api3.yubico.com', 'api4.yubico.com', 'api5.yubico.com'];

    Verifier.PATH = 'wsapi/2.0/verify';

    Verifier.ERRORS = {
      'OK': 'Validation successful',
      'REPLAYED_OTP': 'The OTP has already been used.',
      'REPLAYED_REQUEST': 'Server has seen the OTP/Nonce combination before.',
      'BAD_SIGNATURE': 'The request signature failed verification.',
      'MISSING_PARAMETER': 'The request lacks a parameter.',
      'NO_SUCH_CLIENT': 'The request id does not exist.',
      'OPERATION_NOT_ALLOWED': 'The request id is not allowed to verify OTPs.',
      'BACKEND_ERROR': 'Unexpected error in Yubico server.',
      'NOT_ENOUGH_ANSWERS': 'Server could not get requested number of syncs during before timeout.',
      'BAD_SERVER_SIGNATURE': 'Server responded with invalid signature',
      'TIMEOUT': 'Validation server took too long to respond',
      'NETWORK_ERROR': 'Network communication failed',
      'HTTP_ERROR': 'Server sent HTTP error code'
    };

    function Verifier(apiId, apiKey, timeoutMs) {
      this.apiId = apiId;
      this.apiKey = apiKey;
      this.timeoutMs = timeoutMs != null ? timeoutMs : 7000;
    }

    Verifier.prototype.errorMsg = function(err) {
      return Verifier.ERRORS[err] || 'Unknown error';
    };

    Verifier.prototype.verify = function(otp, done) {
      var params;

      params = getRequestParams(this.apiId, this.apiKey, otp);
      return verify(Verifier.HOSTS, Verifier.PATH, this.timeoutMs, params, this.apiKey, done);
    };

    return Verifier;

  })();

}).call(this);
