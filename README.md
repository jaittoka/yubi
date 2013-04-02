yubi
====

Yubikey client for node.js

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
