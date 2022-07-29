
require('dotenv').config()

var config = require('nconf');

import { join } from 'path'

let file = join(process.cwd(), 'config', 'anypay.json')

config.argv({ parseValues: true })
   .env({ parseValues: true })
   .file({ file });

config.defaults({
  'DOMAIN': 'api.anypayx.com',
  'API_BASE': 'https://api.anypayx.com',
  'AMQP_URL': 'amqp://guest:guest@localhost:5672/',
  'DATABASE_URL': 'postgres://postgres@localhost:5432/anypay',
  'EMAIL_SENDER': 'support@anypayx.com',
  'KRAKEN_PLUGIN': false,
  'mempool_space_fees_enabled': true,
  'rocketchat_webhook_url': false
})

export { config } 
