
import { protocol, schema } from '../../../lib/pay/json_v2'

import { badRequest, notFound } from 'boom'

import { getInvoice } from '../../../lib/invoices'
import { log } from '../../../lib/log'

async function ensureInvoice(req) {

  req.invoice = await getInvoice(req.params.uid)

  if (!req.invoice) { throw notFound() }

}

export async function listPaymentOptions(req, h) {

  try {

    await ensureInvoice(req)

    let valid = await schema.Protocol.PaymentOptions.headers.validateAsync(req.headers, {
      allowUnknown: true
    })

    let response = await protocol.listPaymentOptions(req.invoice)

    return h.response(response)

  } catch(error) {

    log.error('listpaymentoptions.error', error)

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

    log.error('handlepost.error', error)

    return badRequest({ error: error.message })

  }

}

async function getPaymentRequest(req, h) {

  try {

    await schema.Protocol.PaymentRequest.headers.validateAsync(req.headers, { allowUnknown: true })
    
    let response = await protocol.getPaymentRequest(req.invoice, req.payload)

    await schema.Protocol.PaymentRequest.response.validate(response)

    return h.response(response)

  } catch(error) {

    log.error('getpaymentrequest.error', error)

    return badRequest({ error: error.message })

  }

}

async function verifyUnsignedPayment(req, h) {

  try {

    await schema.Protocol.PaymentVerification.headers.validateAsync(req.headers, { allowUnknown: true })

    let response = await protocol.verifyUnsignedPayment(req.invoice, req.payload)

    await schema.Protocol.PaymentVerification.response.validate(response)

    return h.response(response)

  } catch(error) {

    log.error('validatepayment.error', error)

    return badRequest({ error: error.message })

  }

}

async function submitPayment(req, h) {

  try {

    await schema.Protocol.Payment.headers.validateAsync(req.headers, { allowUnknown: true })

    let response = await protocol.sendSignedPayment(req.invoice, req.payload)

    await schema.Protocol.Payment.response.validateAsync(response)

    return h.response(response)

  } catch(error) {

    log.error('submitpayment.error', error)

    return badRequest({ error: error.message })

  }

}

