
import { protocol, schema } from '../../../lib/pay/json_v2'
import { detectWallet } from '../../../lib/pay'

import { badRequest, notFound } from 'boom'

import { getInvoice } from '../../../lib/invoices'
import { log } from '../../../lib/log'

async function ensureInvoice(req) {

  req.invoice = await getInvoice(req.params.uid)

  if (!req.invoice) { throw notFound() }

  if (req.invoice.status === 'paid') {
    throw new Error('invoice already paid')
  }

  if (req.invoice.status === 'cancelled') {
    throw new Error('invoice cancelled')
  }

}

export async function listPaymentOptions(req, h) {

  try {

    await ensureInvoice(req)

    await schema.Protocol.PaymentOptions.headers.validateAsync(req.headers, {
      allowUnknown: true
    })

    let wallet = detectWallet(req.headers, req.invoice.uid)

    let response = await protocol.listPaymentOptions(req.invoice, { wallet })

    return h.response(response)

  } catch(error) {

    log.info('pay.jsonv2.payment-options.error', error)
    log.error('pay.jsonv2.payment-options.error', error)

    return badRequest(error)

  }

}

export async function handlePost(req, h) {

  try {

    await ensureInvoice(req)

    switch(req.headers['x-content-type']) {

      case('application/payment-request'):

        return getPaymentRequest(req, h)

      case('application/payment-verification'):

        return verifyUnsignedPayment(req, h)

      case('application/payment'):

        return submitPayment(req, h)

      default:
        
        throw new Error('Invalid Content-Type header')

    }

  } catch(error) {

    log.info('pay.jsonv2.post.error', { error: error.message })
    
    log.error('pay.jsonv2.post.error', error)

    return h.response({ error: error.message }).code(400)

  }

}

async function getPaymentRequest(req, h) {

  try {

    await ensureInvoice(req)

    await schema.Protocol.PaymentRequest.headers.validateAsync(req.headers, { allowUnknown: true })

    let wallet = detectWallet(req.headers, req.invoice.uid)
    
    let response = await protocol.getPaymentRequest(req.invoice, req.payload, { wallet })

    await schema.Protocol.PaymentRequest.response.validate(response)

    return h.response(response)

  } catch(error) {

    log.error('pay.jsonv2.payment-request.error', error)

    return h.response({ error: error.message }).code(400)

  }

}

async function verifyUnsignedPayment(req, h) {

  try {

    await ensureInvoice(req)

    await schema.Protocol.PaymentVerification.headers.validateAsync(req.headers, { allowUnknown: true })

    let wallet = detectWallet(req.headers, req.invoice.uid)

    var params = req.payload

    params.transactions = req.payload.transactions.map(transaction => {
      return {
        txhex: transaction.tx,
        txkey: transaction.tx_key,
        txid: transaction.txid
      }
    })

    let response = await protocol.verifyUnsignedPayment(req.invoice, params, { wallet })

    console.log('RESPONSE', response)

    await schema.Protocol.PaymentVerification.response.validate(response)

    return h.response(response)

  } catch(error) {

    log.info('pay.jsonv2.payment-verification.error', {
      error: error.message,
      account_id:
      req.invoice.account_id,
      invoice_uid: req.invoice.uid
    })

    return badRequest(error)

  }

}

async function submitPayment(req, h) {

  try {

    await schema.Protocol.Payment.headers.validateAsync(req.headers, { allowUnknown: true })

    let wallet = detectWallet(req.headers, req.invoice.uid)

    await ensureInvoice(req)

    var params = req.payload

    console.log("PAYLOAD", params)

    params.transactions = req.payload.transactions.map(transaction => {
      return {
        txhex: transaction.tx,
        txkey: transaction.tx_key,
        txid: transaction.tx_hash || transaction.txid
      }
    })

    let response = await protocol.sendSignedPayment(req.invoice, req.payload, { wallet })

    //await schema.Protocol.Payment.response.validateAsync(response)

    return h.response(response)

  } catch(error) {

    log.error('pay.jsonv2.payment.error', error)

    return badRequest(error)

  }

}

