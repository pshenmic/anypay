#!/usr/bin/env ts-node

require('dotenv').config();

var JSONRPC = require('../lib/jsonrpc');

var rpc = new JSONRPC();

(async function() {

  let address = process.argv[2];

  console.log(address);

  try {

  let resp = await rpc.call('validateaddress', [address]);

  console.log(resp);

  } catch(error) {

  console.error(error.message);

  }

})();

