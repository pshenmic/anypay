const Invoice = require("../../../lib/models/invoice");
const log = require('winston');
const Boom = require('boom');
const uuid = require('uuid')

import {replaceInvoice} from '../../../lib/invoice';

import {emitter} from '../../../lib/events';
import {plugins} from '../../../lib/plugins';
import {emitter} from '../../../lib/events';
import { statsd } from '../../../lib/stats/statsd';

module.exports.index = async (request, reply) => {

  log.info(`controller:invoices,action:index`);

  var invoices = await Invoice.findAll({
    where: {
      account_id: request.auth.credentials.accessToken.account_id
    }
  });

  return { invoices };
};

module.exports.replace = async (request, reply) => {

  let invoiceId = request.params.uid;

  log.info(`controller:invoices,action:replace,invoice_id:${invoiceId}`);

  let invoice = await Invoice.findOne({
    where: {
      uid: invoiceId
    }
  });

  if (invoice) {

    invoice = await replaceInvoice(invoice.uid, request.payload.currency);

    return invoice;

  } else {

    log.error('no invoice found', invoiceId);

    throw new Error('invoice not found')
  }

}

module.exports.create = async (request, reply) => {

  /*
    Dynamicallly look up coin and corresponding plugin given the currency
    provided.
  */

  log.info(`controller:invoices,action:create`);

	if (!request.payload.currency) {
		throw Boom.badRequest('no currency paramenter provided')
	}

	log.info('currency parameter provided')

	if (!(request.payload.amount > 0)) {
		throw Boom.badRequest('amount must be greater than zero')	
	}

	log.info('amount is greater than zero')

  try {

    let plugin = await plugins.findForCurrency(request.payload.currency);

    let invoice = await plugin.createInvoice(request.account.id, request.payload.amount);

    if(invoice){
   
      log.info('invoice.created', invoice.toJSON());

      emitter.emit('invoice.created', invoice.toJSON());

    }

    return invoice;

  } catch(error) {

    throw Boom.badRequest(error.message);

    log.error(error.message);

  }

};

module.exports.show = async function(request, reply) {

  let invoiceId = request.params.invoice_id;

  log.info(`controller:invoices,action:show,invoice_id:${invoiceId}`);

  let invoice = await Invoice.findOne({
    where: {
      uid: invoiceId
    }
  });

  if (invoice) {

    log.info('invoice.requested', invoice.toJSON());

    emitter.emit('invoice.requested', invoice.toJSON()); 

    return invoice;

  } else {

    log.error('no invoice found', invoiceId);

    throw new Error('invoice not found')
  }

}

emitter.on('invoice.requested', async (invoice) => {

  statsd.increment('invoice requested')

  log.info("checking.invoice:", invoice.uid, invoice.currency, invoice.amount, invoice.address)

  plugins.checkAddressForPayments(invoice.address, invoice.currency);

});
emitter.on('invoice.created', async (invoice) => {
  
  log.info("invoice.created")
 
  poll(invoice)
  
})

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function poll(invoice){

  invoice = await Invoice.findOne({ where: {uid: invoice.uid}})

  if(invoice.status == 'paid'){return}

  let plugin = await plugins.findForCurrency(invoice.currency);

  await plugins.checkAddressForPayments(invoice.address,invoice.currency)

  if(plugin.poll == false){return}

  let waitTime = [5000,2000,2000,4000,4000,8000,8000.8000,16000,16000,16000,16000]

  for(let i=0;i<waitTime.length;i++){

    invoice = await Invoice.findOne({ where: {uid: invoice.uid}})

    if(invoice.status == 'paid'){break}

    log.info("polling.invoice:", invoice.uid, invoice.currency, invoice.amount, invoice.address)

    await plugins.checkAddressForPayments(invoice.address,invoice.currency)

    await sleep(waitTime[i]);

  }

}
