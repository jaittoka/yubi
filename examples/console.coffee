Verifier = require '../lib/yubi'

# Replace the API_ID and API_KEY with your own. You can get
# your api key at: https://upgrade.yubico.com/getapikey/
API_ID = 'your id'
API_KEY = 'your key'

v = new Verifier API_ID, API_KEY

console.log 'Plug in your Yubikey and press the transmit button on it.'
process.stdin.resume()
process.stdin.setEncoding 'utf8'
process.stdin.on 'data', (data) ->
  v.verify data, (status) ->
    console.log v.errorMsg(status)