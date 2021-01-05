import * as Hapi from 'hapi';

import { verifyPayment, buildPaymentRequestForInvoice, detectWallet } from '../../../lib/pay';

import { amqp, log } from '../../../lib';
import { logInfo } from '../../../lib/logger';

import { submitPayment, SubmitPaymentResponse } from './json_payment_requests';

import * as Boom from 'boom';

export async function show(req, h) {

  let { content } = await buildPaymentRequestForInvoice({
    uid: req.params.uid,
    currency: 'BSV', 
    protocol: 'BIP270'
  })

  logInfo(`pay.request.bsv.content`, content)

  let response = h.response(content);

  response.type('application/json');

  return response;

}

export async function create(req, h) {

  logInfo('bsv.bip270.broadcast', {
    headers: req.headers,
    payload: req.payload
  })

  try {

    let wallet = detectWallet(req.headers, req.params.uid)

    let response: SubmitPaymentResponse = await submitPayment({
      transactions: [req.payload.transaction],
      currency: 'BSV',
      invoice_uid: req.params.uid,
      wallet
    })

    logInfo('bsv.bip270.broadcast.success', {
      headers: req.headers,
      payload: req.payload,
      response
    })

    return {

      payment: req.payload,

      memo: "Payment Approved By Anypay®",

      error: 0

    }

  } catch(error) {

    log.error('bsv.bip270.broadcast.failed', error)

    return h.response({

      payment: req.payload,
      
      memo: error.message,

      error: 1

    }).code(500)

  }

}

