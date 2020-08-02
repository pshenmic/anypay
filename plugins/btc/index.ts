require('dotenv').config()
const btc = require('bitcore-lib')
import {generateInvoice} from '../../lib/invoice';

import * as chainSoAPI from '../../lib/chainSoAPI';

import {Invoice} from '../../types/interfaces';

import {statsd} from '../../lib/stats/statsd' 

import {models} from '../../lib/models';

import {rpc} from './jsonrpc';


export async function submitTransaction(rawTx: string) {

  return rpc.call('sendrawtransaction', [rawTx]);

}

var WAValidator = require('anypay-wallet-address-validator');

export function validateAddress(address: string){

  let valid = WAValidator.validate( address, 'BTC')

  return valid;

}

export async function getNewAddress(deprecatedParam){
  console.log('deprecated', deprecatedParam);

  return deprecatedParam.value;

}

function deriveAddress(xkey, nonce){

  let address = new btc.HDPublicKey(xkey).deriveChild(nonce).publicKey.toAddress().toString()

  return address 

}

async function createInvoice(accountId: number, amount: number) {

  let start = new Date().getTime()

  let invoice = await generateInvoice(accountId, amount, 'BTC');

  statsd.timing('BTC_createInvoice', new Date().getTime()-start)

  statsd.increment('ZEN_createInvoice')

  return invoice;

}

async function checkAddressForPayments(address:string, currency:string){

  let start = new Date().getTime()

  let payments = await chainSoAPI.checkAddressForPayments(address,currency);

  statsd.timing('BTC_checkAddressForPayments', new Date().getTime()-start)

  statsd.increment('BTC_checkAddressForPayments')

  return payments;
}

const currency = 'BTC';

const poll = false;

export {

  currency,

  createInvoice,

  checkAddressForPayments,

  poll

};
