const http = require("superagent")

import {generateInvoice} from '../../lib/invoice';;

import {Payment,Invoice} from '../../types/interfaces';

import {statsd} from '../../lib/stats/statsd'

async function createInvoice(accountId: number, amount: number) {

  let start = new Date().getTime()

  let invoice = await generateInvoice(accountId, amount, 'LTC');

  statsd.timing('LTC_createInvoice', new Date().getTime()-start)
  
  statsd.increment('LTC_createInvoice')

  return invoice;

}

async function checkAddressForPayments(address:string, currency:string){
  
  let start = new Date().getTime()

  let payments: Payment[]=[];

  let resp = await http.get(`https://chain.so/api/v2/get_tx_received/${currency}/${address}`)

  for (let tx of resp.body.data.txs){

    let p: Payment = { 
 
      currency: currency,

      address: address,

      amount: tx.value,

      hash: tx.txid

      };  

      payments.push(p)

      }

    statsd.timing('LTC_checkAddressForPayments', new Date().getTime()-start)

    statsd.increment('LTC_checkAddressForPayments')


      return payments;
}
const currency = 'LTC';

const poll = false;

export {

  currency,

  createInvoice,

  checkAddressForPayments,

  poll

};

