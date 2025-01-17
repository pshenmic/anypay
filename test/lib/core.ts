
import { setAddress, unsetAddress } from '../../lib/core';

import { lockAddress, unlockAddress  } from '../../lib/addresses';

import { models } from '../../lib/models';

import * as Chance from 'chance';
import * as assert from 'assert';

var chance = new Chance();

describe("Anypay Core", () => {

  var account, address;

  before(async function() {
    let email = chance.email().toUpperCase();

    account = await models.Account.create({
      email: email
    });

  });

  describe("Updating Account.models Address", () => {

    it("#setAddress should fail if locked", async () => {

      await lockAddress(account.id, 'DASH');
      
      try {

        await setAddress({
          account_id: account.id,
          currency: 'DASH',
          address: 'XojEkmAPNzZ6AxneyPxEieMkwLeHKXnte5'
        }); 

        assert(false);

      } catch(error) {

        assert.strictEqual(error.message, `DASH address locked`); 

        await unlockAddress(account.id, 'DASH');

      }

    });

    it("setAddress should set a DASH address", async () => {

      let addressChangeset = {
        account_id: account.id,
        currency: 'DASH',
        address: 'XojEkmAPNzZ6AxneyPxEieMkwLeHKXnte5'
      };

      await setAddress(addressChangeset); 
      
      address = await models.Address.findOne({ where: {
        account_id: account.id,
        currency:"DASH"
      }});

      assert.strictEqual(address.value, addressChangeset.address);

    });

    it("setAddress should set a BTC address", async () => {

      let addressChangeset = {
        account_id: account.id,
        currency: 'BTC',
        address: '1KNk3EWYfue2Txs1MThR1HLzXjtpK45S3K'
      };

      await setAddress(addressChangeset); 

      address = await models.Address.findOne({ where: {
        account_id: account.id,
	currency: "BTC"
      }});

      assert.strictEqual(address.value, addressChangeset.address);

    });

    it("unsetAddress should remove a DASH address", async () => {

      let addressChangeset = {
        account_id: account.id,
        currency: 'DASH',
        address: 'XojEkmAPNzZ6AxneyPxEieMkwLeHKXnte5'
      };

      await setAddress(addressChangeset);

      await unsetAddress(addressChangeset); 

      address = await models.Address.findOne({ where: {
        account_id: account.id,
	currency: "DASH"
      }});

      assert(!address);

    });

  });

  describe("Setting A Dynamic Address Not In Hardcoded List", () => {

    it("#setAddress should set a ZEN ZenCash address", async () => {

      let addressChangeset = {
        account_id: account.id,
        currency: 'ZEN',
        address: 'zszpcLB6C5B8QvfDbF2dYWXsrpac5DL9WRk'
      };

      await setAddress(addressChangeset); 

      var address = await models.Address.findOne({ where: {
        account_id: account.id,
        currency: 'ZEN'
      }});

      assert.strictEqual(address.value, addressChangeset.address);

    });

    it("#unsetAddress should set a ZEN ZenCash address", async () => {

      let addressChangeset = {
        account_id: account.id,
        currency: 'ZEN',
        address: 'zszpcLB6C5B8QvfDbF2dYWXsrpac5DL9WRk'
      };

      await unsetAddress(addressChangeset); 

      var address = await models.Address.findOne({ where: {
        account_id: account.id,
        currency: 'ZEN'
      }});

      assert(!address);

    });

  });

});

