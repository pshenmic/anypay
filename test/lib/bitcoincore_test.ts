require('dotenv').config()

import { expect } from '../utils'

import { find } from '../../lib/plugins'

describe("Bitcoin BTC", () => {
  var plugin;

  before(async () => {

    plugin = await find({ currency: 'BTC', chain: 'BTC' })

  })

  describe("Validation", () => {
    it("should validate legacy account", async () => {

      let valid = await plugin.validateAddress('1PCu7YjvmJYg5McWZJh7XPxKF5iFrvFu1j')
      let valid2 = await plugin.validateAddress('33Z1TN8zxC7aBpLjVrnPKtF7jmihTEAH2s')

      expect(valid).to.be.equal(true);
      expect(valid2).to.be.equal(true);
    })

    it("should validate bech32 account", async () => {

      let valid = await plugin.validateAddress('bc1qc7slrfxkknqcq2jevvvkdgvrt8080852dfjewde450xdlk4ugp7szw5tk9')

      expect(valid).to.be.equal(true);

    })

    it("return false on bad input", async () => {

      let valid = await plugin.validateAddress('fake');

      expect(valid).to.be.equal(false);

    })

  })

})
