require('dotenv').config();

import * as assert from 'assert';

import {getSupportedCoins} from '../../lib/accounts';

import { registerAccount } from '../../lib/accounts';

import { setAddress } from '../../lib/core';

import * as Chance from 'chance';

const chance = Chance();

describe("Supported Coins For Account", () => {

  // Account supported coins override the default global

  it("should return a list for each account", async () => {

    let account = await registerAccount(chance.email(), chance.word());
    
    await setAddress({
      account_id: account.id,
      currency: "BTC",
      address: "12Y7DPDJzy4DBKXgDBRJBJnpUTPPcgYHtm"
    });

    let coins = await getSupportedCoins(account.id);

    console.log("coins", coins);

    assert(coins['BTC'].enabled);

  });

});

