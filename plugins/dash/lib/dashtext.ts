
require('dotenv').config()

import * as http from 'superagent';

import * as qs from 'qs';

export async function generateCode(address: string, amount: number, uid?: string): Promise<string> {

  let requestData = {
    token: process.env.DASHTEXT_TOKEN,
    address,
    amount: (amount * 100000000).toString(), // convert to satoshis
    note: "Invoice 4434"
  };

  let resp = await http
    .post('https://api.dashtext.io/apibuy.php')
    .send(qs.stringify(requestData));

  return JSON.parse(resp.text);

}

export async function lookupAddressFromPhoneNumber(phone: string) {

  if (phone.match(/^\+/)) {
    phone = phone.substring(1);
  }

  let requestData = {
    token: process.env.DASHTEXT_TOKEN,
    phone
  };

  let resp = await http
    .post('https://api.dashtext.io/address.php')
    .send(qs.stringify(requestData));

  return JSON.parse(resp.text).addr;

}
