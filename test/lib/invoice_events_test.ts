
import * as utils from '../utils'

import { expect, server, log } from '../utils'

import { listInvoiceEvents } from '../../lib/events'

import { createInvoice } from '../../lib/invoices'

import { TestClient } from 'payment-protocol'

import { Transaction } from 'bsv'

import delay from 'delay'

describe('Invoice Events', () => {

  var invoice;

  before(async () => {

    let response = await utils.newAccountWithInvoice()
    invoice = response[1]

  })

  it('each event should have a list of events associated', async () => {

    let events = await listInvoiceEvents(invoice)

    expect(events).to.be.an('array')

  })

  it.skip('should have a created event by default upon creation', async () => {

    let events = await listInvoiceEvents(invoice, 'invoice.created')

    const [event] = events

    expect(event.get('invoice_uid')).to.be.equal(invoice.uid)

    expect(event.get('type')).to.be.equal('invoice.created')

  })

  it.skip('should have a paid event once paid', async () => {

    let [event] = await listInvoiceEvents(invoice, 'invoice.paid')

    expect(event.get('invoice_uid')).to.be.equal(invoice.uid)

    // pay invoice

    expect(event.get('type')).to.be.equal('invoice.paid')

  })

  describe("Payment Protocol Events", () => {

    var account, invoice;

    before(async () => {

      [account, invoice] = await utils.newAccountWithInvoice()

    })

    it('has an event for every payment verification request', async () => {

      invoice = await utils.newInvoice({ amount: 5.25 })

      let events = await listInvoiceEvents(invoice, 'pay.jsonv2.payment-verification')

      expect(events.length).to.be.equal(0)

      let client = new TestClient(server, `/i/${invoice.uid}`, {
        headers: {
          'x-requested-with': 'co.edgesecure.app'
        }
      })

      let { paymentOptions } = await client.getPaymentOptions()

      await client.selectPaymentOption(paymentOptions[0])

      const tx = new Transaction().serialize()

      try {

        await client.verifyPayment({
          chain: 'BSV',
          currency: 'BSV',
          transactions: [{ tx }]
        })

      } catch(error) {

        log.debug(error)

      }
      
      events = await listInvoiceEvents(invoice)

      events = await listInvoiceEvents(invoice, 'pay.jsonv2.payment-verification')

      expect(events[0].get('wallet')).to.be.equal('edge')
 
      expect(events.length).to.be.equal(1)

    })

    it.skip('has an event for submission of transaction to network', async () => {

      let events = await listInvoiceEvents(invoice, 'pay.jsonv2.payment.broadcast')

      expect(events.length).to.be.equal(0)

      let client = new TestClient(server, `/i/${invoice.uid}`, {
        headers: {
          'x-requested-with': 'co.edgesecure.app'
        }
      })

      const tx = new Transaction().serialize()

      try {

        await client.sendPayment({
          chain: 'BSV',
          currency: 'BSV',
          transactions: [{ tx }]
        })

      } catch(error) {

        log.debug(error)

      }

      events = await listInvoiceEvents(invoice, 'pay.jsonv2.payment.broadcast')
 
      expect(events.length).to.be.equal(0)

      events = await listInvoiceEvents(invoice, 'pay.jsonv2.payment.unsigned.verify.error')

      expect(events[0].get('wallet')).to.be.equal('edge')

    })

    it.skip('has an event for response from failed transaction broadcast ', async () => {

      let invoice = await createInvoice({ 
        account,
        amount: 0.10
      })

      let client = new TestClient(server, `/i/${invoice.uid}`, {
        headers: {
          'x-requested-with': 'co.edgesecure.app'
        }
      })

      const tx = new Transaction().serialize()

      await client.sendPayment({
        chain: 'BSV',
        currency: 'BSV',
        transactions: [{ tx }]
      })

      // Simulate failure by the blockchain p2p provider
 
      let events = await listInvoiceEvents(invoice, 'pay.jsonv2.payment.error')

      await delay(5000)
 
      expect(events.length).to.be.equal(1)

      expect(events[0].get('wallet')).to.be.equal('edge')

    })

  })

})

