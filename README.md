yubi
====

Yubikey client for node.js

Uses Yubico's validation servers to do the actual validation. It sends a validation
request in parallel to all five validation servers:

```
api.yubico.com
api2.yubico.com
api3.yubico.com
api4.yubico.com
api5.yubico.com
```

install
=======

```
npm install yubi
```

usage
=====
Code to verify the Yubikey generated one time password (OTP):

```
Verifier = require 'yubi'

API_ID = 'your api id'
API_KEY = 'your api key'

v = new Verifier API_ID, API_KEY
v.verify otp, (status) ->
  if status is 'OK'
    console.log 'OTP is ok'
  else
    console.log v.errorMsg(status)
```

example
=======
There is an example console application (`examples/console.coffee`) that waits for user input (OTP). When it gets
OTP from the console, it validates it. 