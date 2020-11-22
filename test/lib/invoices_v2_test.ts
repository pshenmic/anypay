
import { chance, assert } from '../utils'

import { v2 } from '../../lib/v2'

describe("Invoices V2", () => {

  describe("Creating An Invoice With Library", () => {
    var account;

    before(async () => {

      account = await v2.accounts.findOrCreate({
        where: {
          email: chance.email()
        },
        defaults: {
          email_verified: true
        }
      })

    })

    it("#should create an invoice for an existing account with no payment options", async () => {

      await account.addresses.unsetAll()

      let invoice = await account.invoices.create({
        currency: 'USD',
        amount: 10
      })

      assert.strictEqual(invoice.currency, 'USD')
      assert.strictEqual(invoice.amount, 10)

      assert(invoice.payment_options.length === 0)
      assert(invoice.uid)
      assert(invoice.uri)
      assert(invoice.web_url)
    })

    it("#should create an invoice for an existing account with one payment options", async () => {

      await account.addresses.unsetAll()
      await account.addresses.update('BCH', 'bitcoincash:qp2tqtmhm6ukrz0hnmxarqmdt2l4p38gdcwuxj40mr')

      let invoice = await account.invoices.create({
        currency: 'USD',
        amount: 10
      })

      assert.strictEqual(invoice.currency, 'USD')
      assert.strictEqual(invoice.amount, 10)

      assert(invoice.payment_options.length === 1)
      assert(invoice.payment_options[0].outputs.length > 0) // it has at least a single output to the destination address
      assert(invoice.payment_options[0].outputs[0].address, 'bitcoincash:qp2tqtmhm6ukrz0hnmxarqmdt2l4p38gdcwuxj40mr')
      assert(invoice.uid)
      assert(invoice.uri)
      assert(invoice.web_url)
    })

  })

  describe("Creating An Invoice With HTTP", () => {

  })

})
