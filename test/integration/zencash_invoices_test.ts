import {Server} from '../../servers/rest_api/server';
import * as assert from 'assert';
import {hash} from '../../lib/password';

import {setAddress} from '../../lib/core';

import { database, models } from '../../lib';

import * as Chance from 'chance';
const chance = new Chance();

describe("Creating Bitcoin Cash Invoices Via REST", async () => {
  var accessToken, server;
  
  before(async () => {
    await database.sync();
    server = await Server();

    try {
      var account = await models.Account.create({
        email: chance.email(),
        password_hash: await hash(chance.word())
      })

      accessToken = await models.AccessToken.create({
        account_id: account.id
      })

      await setAddress({
        account_id: account.id,
        currency: 'ZEN',
        address: 'zszpcLB6C5B8QvfDbF2dYWXsrpac5DL9WRk'
      });
      await setAddress({
        account_id: account.id,
        currency: 'DASH',
        address: 'XnBw5G3wAU1j7oF1QTDVVbmUTVmEyPNPze'
      });

    } catch(error) {
      console.error('ERROR', error.message);
    }
  });

  it("POST /invoices should create a zencash invoice", async () => {
    try {

      let response = await server.inject({
        method: 'POST',
        url: '/invoices',
        payload: {
          amount: 10,
          currency: 'ZEN'
        },
        headers: {
          'Authorization': auth(accessToken.uid, "")
        }
      })

      console.log('RESP', response);

      assert(response.result.address);
      assert(response.result.id > 0);
      assert(response.result.amount > 0);

    } catch(error) {

      console.error('ERROR', error.message);
    }
  })

})

function auth(username, password) {
  return `Basic ${new Buffer(username + ':' + password).toString('base64')}`;
}

