"use strict";
require('dotenv').config();

import('bitcore-lib')

import * as Hapi from "hapi";
const HapiSwagger = require("hapi-swagger");

import { log } from '../../lib';

import { attachMerchantMapRoutes } from '../map/server';

import { validateToken, validateAdminToken } from '../auth/hapi_validate_token';

import * as ActivateDeactivateCoinActor from '../../actors/activate_deactivate_coin/actor';

import { hash, bcryptCompare } from '../../lib/password';

import { accountCSVReports } from './handlers/csv_reports';

import { parseUnconfirmedTxEventToPayments } from '../../plugins/dash/lib/blockcypher';

/* Import all handlers from './handlers directory */
import { requireHandlersDirectory } from '../../lib/rabbi_hapi';
import { join } from 'path';
const handlers = requireHandlersDirectory(join(__dirname, './handlers'));
/* end handlers import */

const AccountLogin = require("../../lib/account_login");

const sequelize = require("../../lib/database");

const Joi = require('joi');

import { httpAuthCoinOracle } from './auth/auth_coin_oracle';

import { models } from '../../lib'

import {events} from '../../lib/core';
import {notify} from '../../lib/slack/notifier';

events.on('address:set', async (changeset) => {

  let account = await models.Account.findOne({ where: { id: changeset.account_id }});

  let value = Object.assign({account: account.email, id: changeset.address_id}, changeset);

  delete value.address_id;

  await notify(`address:set:${JSON.stringify(value)}`);

});

const validatePassword = async function(request, username, password, h) {

  /* 1) check for account by email (username)
     2) check for account password by hash compare
     3) check for sudo password by hash compare
     4) generate access token with expiration
  */

  if (!username || !password) {
    return {
      isValid: false
    };
  }

  var account = await models.Account.findOne({
    where: {
      email: username.toLowerCase()
    }
  });

  if (!account) {

    return {
      isValid: false
    }
  }

  try {

    var accessToken = await AccountLogin.withEmailPassword(username, password);

    if (accessToken) {

      return {
        isValid: true,
        credentials: { accessToken, account }
      };

    }
  } catch(error) {

    log.error(error.message);

  }

  // check for sudo password
  try {

    await bcryptCompare(password, process.env.SUDO_PASSWORD_HASH);

  } catch(error) {

    return {
      isValid: false
    }

  }

  var isNew;
  [accessToken, isNew] = await models.AccessToken.findOrCreate({
    where: {
      account_id: account.id
    },
    defaults: {
      account_id: account.id
    }
  });

  console.log(`access token created: ${isNew}`, accessToken.toJSON());

  return {
    isValid: true,
    credentials: { accessToken, account }
  }

};

const getAccount = async function(request, username, password, h) {

  var account = await models.Account.findOne({
    where: {
      id: request.params.account_id
    }
  });

  if (account) {

		request.account = account;
		request.is_public_request = true;

    return {
      isValid: true,
      credentials: { account: account }
    }
  } else {
    return {
      isValid: false
    }
  }
}

const kBadRequestSchema = Joi.object({
  statusCode: Joi.number().integer().required(),
  error: Joi.string().required(),
  message: Joi.string().required()
}).label('BoomError')

function responsesWithSuccess({ model }) {
  return {
    'hapi-swagger': {
      responses: {
        200: {
          description: 'Success',
          schema: model
        },
        400: {
          description: 'Bad Request',
          schema: kBadRequestSchema,
        },
        401: {
          description: 'Unauthorized',
          schema: kBadRequestSchema,
        },
      },
    },
  }
}

async function Server() {

  var server = new Hapi.Server({
    host: process.env.HOST || "localhost",
    port: process.env.PORT || 8000,
    routes: {
      cors: true,
      validate: {
        options: {
          stripUnknown: true
        }
      },
      files: {
          relativeTo: join(__dirname, '../../docs')
      }
    }
  });

  server.ext('onRequest', function(request, h) {

    if ('application/payment' === request.headers['content-type']) {
      request.headers['content-type'] = 'application/json';
      request.headers['x-content-type'] = 'application/payment';
    }

    if ('application/payment' === request.headers['accept']) {
      request.headers['content-type'] = 'application/json';
      request.headers['x-content-type'] = 'application/payment';
    }

    if ('application/bitcoinsv-payment' === request.headers['content-type']) {
      request.headers['content-type'] = 'application/json';
      request.headers['x-content-type'] = 'application/bitcoinsv-payment';
    }

    if ('application/dash-payment' === request.headers['content-type']) {
      request.headers['content-type'] = 'application/json';
      request.headers['x-content-type'] = 'application/dash-payment';
    }

    if ('application/dash-payment' === request.headers['accept']) {
      request.headers['accept'] = 'application/json';
      request.headers['x-accept'] = 'application/dash-payment';
    }

    if ('application/dash-paymentack' === request.headers['accept']) {
      request.headers['accept'] = 'application/json';
      request.headers['x-accept'] = 'application/dash-paymentack';
    }

    if ('application/bitcoinsv-paymentack' === request.headers['accept']) {
      request.headers['content-type'] = 'application/json';
      request.headers['x-content-type'] = 'application/bitcoinsv-payment';
      request.headers['x-accept'] = 'application/bitcoinsv-paymentack';
    }

    if ('application/verify-payment' === request.headers['content-type']) {
      request.headers['content-type'] = 'application/json';
      request.headers['x-content-type'] = 'application/verify-payment';
    }

    if ('application/verify-payment' === request.headers['accept']) {
      request.headers['content-type'] = 'application/json';
      request.headers['x-content-type'] = 'application/verify-payment';
    }

    return h.continue;
  });

  server.ext('onRequest', function(request, h) {

    if ('application/payment' === request.headers['content-type']) {
      request.headers['content-type'] = 'application/json';
      request.headers['x-content-type'] = 'application/payment';
    }

    return h.continue;
  });

  await server.register(require('hapi-auth-basic'));
  await server.register(require('inert'));
  await server.register(require('vision'));
  const swaggerOptions = server.register({
    plugin: HapiSwagger,
    options: {
      info: {
        title: 'Anypay API Documentation',
        version: '1.0.1',
      },
      securityDefinitions: {
        simple: {
          type: 'basic',
        },
      },
      security: [{
        simple: [],
      }],
    }
  })

  server.auth.strategy("getaccount", "basic", { validate: getAccount });
  server.auth.strategy("token", "basic", { validate: validateToken });
  server.auth.strategy("password", "basic", { validate: validatePassword });
  server.auth.strategy("adminwebtoken", "basic", { validate: validateAdminToken });
  server.auth.strategy("authoracle", "basic", { validate: httpAuthCoinOracle});

  attachMerchantMapRoutes(server);

  server.route({
    method: "GET",
    path: "/invoices/{invoice_id}",
    handler: handlers.Invoices.show,
    options: {
      tags: ['api'],
      validate: {
        params: {
          invoice_id: Joi.string().required()
        },
      },
      plugins: responsesWithSuccess({ model: models.Invoice.Response })
    }
  });

  server.route({
    method: "GET",
    path: "/invoices/{invoice_uid}/payment_options",
    handler: handlers.InvoicePaymentOptions.show,
    options: {
      tags: ['api']
    }
  });

  server.route({
    method: "GET",
    path: "/grab_and_go_items",
    handler: handlers.GrabAndGoItems.index,
    options: {
      auth: "token",
      tags: ['api']
    }
  });

  server.route({
    method: "GET",
    path: "/invoices",
    handler: handlers.Invoices.index,
    options: {
      auth: "token",
      tags: ['api']
    }
  });
  server.route({
    method: "GET",
    path: "/dashboard",
    handler: handlers.Dashboard.index,
    options: {
      auth: "token"
    }
  });

  server.route({
    method: "POST",
    path: "/invoices/{uid}/replacements",
    handler: handlers.Invoices.replace,
    options: {
      auth: "token",
      tags: ['api'],
    }
  });

  server.route({

    method: "GET",
    path: "/tipjars/{currency}",
    handler: handlers.Tipjars.show,
    options: {
      auth: "token"
    }
  });

  server.route({
    method: "POST",
    path: "/accounts",
    handler: handlers.Accounts.create,
    options: {
      tags: ['api'],
      validate: {
        payload: models.Account.Credentials,
      },
      plugins: responsesWithSuccess({ model: models.Account.Response }),
    },
  });

  server.route({
    method: "GET",
    path: "/accounts/{email}",
    handler: handlers.Accounts.showPublic,
    options: {
      tags: ['api'],
      plugins: responsesWithSuccess({ model: models.Account.Response }),
    },
  });

  server.route({
    method: "PUT",
    path: "/anonymous-accounts",
    handler: handlers.Accounts.registerAnonymous,
    options: {
      auth: "token",
      tags: ['api'],
      validate: {
        payload: models.Account.Credentials,
      },
      plugins: responsesWithSuccess({ model: models.Account.Response }),
    },
  });

  server.route({
    method: "POST",
    path: "/anonymous-accounts",
    handler: handlers.Accounts.createAnonymous,
    options: {
      tags: ['api']
    },
  });

  server.route({
    method: "GET",
    path: "/shares",
    handler: handlers.Shareholders.show,
    options: {
      auth: "token",
      tags: ['api']
    },
  });

  server.route({
    method: "POST",
    path: "/access_tokens",
    handler: handlers.AccessTokens.create,
    options: {
      auth: "password",
      tags: ['api'],
      plugins: responsesWithSuccess({ model: models.AccessToken.Response })
    }
  });

  server.route({
    method: "GET",
    path: "/addresses",
    handler: handlers.Addresses.list,
    options: {
      auth: "token",
      tags: ['api'],
      plugins: responsesWithSuccess({ model: handlers.Addresses.PayoutAddresses }),
    }
  });

  server.route({
    method: "GET",
    path: "/account_addresses",
    handler: handlers.Addresses.index,
    options: {
      auth: "token",
      tags: ['api']
    }
  });

  server.route({
    method: "PUT",
    path: "/addresses/{id}/notes",
    handler: handlers.AddressNotes.update,
    options: {
      auth: "token",
      tags: ['api'],
      validate: {
        params: {
          id: Joi.number().required()
        },
        payload: {
          note: Joi.string().required()
        }
      }
    }
  });

  server.route({
    method: "PUT",
    path: "/addresses/{currency}",
    handler: handlers.Addresses.update,
    options: {
      auth: "token",
      tags: ['api'],
      validate: {
        params: {
          currency: Joi.string().required()
        },
        payload: handlers.Addresses.PayoutAddressUpdate
      },
      plugins: responsesWithSuccess({ model: models.Account.Response })
    }
  });

  server.route({
    method: "GET",
    path: "/account",
    handler: handlers.Accounts.show,
    options: {
      auth: "token",
      tags: ['api'],
      plugins: responsesWithSuccess({ model: models.Account.Response }),
    }
  });

  server.route({
    method: "GET",
    path: "/account/rewards",
    handler: handlers.Accounts.getRewards,
    options: {
      auth: "token",
      tags: ['api'],
    }
  });

  server.route({
    method: "PUT",
    path: "/account",
    handler: handlers.Accounts.update,
    options: {
      auth: "token",
      tags: ['api']
    }
  });

  server.route({
    method: "GET",
    path: "/achs",
    handler: handlers.Achs.index,
    options: {
      auth: "token",
      tags: ['api']
    }
  });

  server.route({
    method: "GET",
    path: "/achs/{account_ach_id}/invoices",
    handler: handlers.AccountAchInvoices.show,
    options: {
      auth: "token",
      tags: ['api']
    }
  });

  server.route({
    method: "POST",
    path: "/invoices/{invoice_uid}/notes",
    handler: handlers.InvoiceNotes.create,
    options: {
      validate: {
        payload: {
          note: Joi.string().required()
        }
      },
      auth: "token",
      tags: ['api']
    }
  });

  server.route({
    method: "GET",
    path: "/coins",
    handler: handlers.Coins.list,
    options: {
      tags: ['api'],
      auth: "token",
      plugins: responsesWithSuccess({ model: handlers.Coins.CoinsIndexResponse }),
    }
  });

  server.route({
    method: "POST",
    path: "/invoices",
    handler: handlers.Invoices.create,
    options: {
      auth: "token",
      tags: ['api'],
      validate: {
        payload: models.Invoice.Request,
      },
      plugins: responsesWithSuccess({ model: models.Invoice.Response }),
    }
  });

  server.route({
    method: "POST",
    path: "/accounts/{account_id}/invoices",
    handler: handlers.Invoices.createPublic,
    options: {
      auth: "getaccount",
      tags: ['api'],
      validate: {
        payload: models.Invoice.Request,
      },
      plugins: responsesWithSuccess({ model: models.Invoice.Response })
    }
  });

  server.route({
    method: "POST",
    path: "/password-resets",
    handler: handlers.Passwords.reset,
    options: {
      tags: ['api'],
      validate: {
        payload: handlers.Passwords.PasswordReset,
      },
      plugins: responsesWithSuccess({ model: handlers.Passwords.Success }),
    }
  });

  server.route({
    method: "POST",
    path: "/password-resets/{uid}",
    handler: handlers.Passwords.claim,
    options: {
      tags: ['api'],
      validate: {
        payload: handlers.Passwords.PasswordResetClaim,
      },
      plugins: responsesWithSuccess({ model: handlers.Passwords.Success }),
    }
  });

  server.route({
    method: "PUT",
    path: "/settings/denomination",
    handler: handlers.Denominations.update,
    options: {
      tags: ['api'],
      auth: "token"
    }
  });

  server.route({
    method: "GET",
    path: "/settings/denomination",
    handler: handlers.Denominations.show,
    options: {
      tags: ['api'],
      auth: "token"
    }
  });

  server.route({
    method: "GET",
    path: "/base_currencies",
    handler: handlers.BaseCurrencies.index,
    options: {
      tags: ['api']
    }
  });

  server.route({
    method: "GET",
    path: "/totals/monthly/usd",
    handler: handlers.MonthlyTotals.usd
  });

  server.route({
    method: "GET",
    path: "/totals/monthly/btc",
    handler: handlers.MonthlyTotals.btc
  });

  server.route({
    method: "GET",
    path: "/totals/monthly/dash",
    handler: handlers.MonthlyTotals.dash
  });

  server.route({
    method: "GET",
    path: "/totals/monthly/transactions/{coin}",
    handler: handlers.MonthlyTotals.totalTransactionsByCoin
  });

  server.route({
    method: "GET",
    path: "/totals/monthly/bch",
    handler: handlers.MonthlyTotals.bch
  });

  server.route({
    method: "GET",
    path: "/totals/monthly/total",
    handler: handlers.MonthlyTotals.total
  });

  server.route({
    method: "GET",
    path: "/totals/monthly/accounts",
    handler: handlers.MonthlyTotals.accounts
  });

  server.route({
    method: "GET",
    path: "/totals/monthly/denomination/{denomination}",
    handler: handlers.MonthlyTotals.denomination
  });

  server.route({
    method: "GET",
    path: "/totals/monthly/denominations",
    handler: handlers.MonthlyTotals.denominations
  });

  server.route({
    method: "GET",
    path: "/account/totals/monthly/{currency}",
    handler: handlers.AccountMonthlyTotals.byCurrency,
    options: {
      auth: "token"
    }
  });

  server.route({
    method: "GET",
    path: "/totals/monthly/count",
    handler: handlers.MonthlyTotals.count
  });

  server.route({
    method: "GET",
    path: "/dashback/totals/alltime",
    handler: handlers.DashbackController.dashbackTotalsAlltime
  });

  server.route({
    method: "GET",
    path: "/dashback/totals/monthly",
    handler: handlers.DashbackController.dashbackTotalsByMonth
  });

  server.route({
    method: "GET",
    path: "/totals/merchants",
    handler: handlers.Totals.merchants
  });

  server.route({
    method: 'GET',
    path: '/ambassador_claims',
    handler: handlers.Ambassadors.list_account_claims,
    options: {
      auth: "token"
    }
  });

  server.route({
    method: 'POST',
    path: '/ambassador_claims',
    handler: handlers.Ambassadors.claim_merchant,
    options: {
      auth: "token"
    }
  });
  
  server.route({
    method: "GET",
    path: "/convert/{oldamount}-{oldcurrency}/to-{newcurrency}",
    handler: handlers.PriceConversions.show,
    options: {
      tags: ['api']
    }
  });

  server.route({
    method: "POST",
    path: "/{input_currency}/payments",
    handler: handlers.CoinOraclePayments.create,
    options: {
      tags: ['api'],
      validate: {
        payload: {
          amount: Joi.required(),
          currency: Joi.string().required(),
          address: Joi.string().required(),
          hash: Joi.string().required(),
          output_hash: Joi.string().optional(),
          output_amount: Joi.optional(),
          output_address: Joi.string().optional(),
          output_currency: Joi.string().optional()
        },
      },
      auth: 'authoracle'
    }
  });

  server.route({
    method: "GET",
    path: "/invoices/{uid}/bip70",
    handler: handlers.PaymentRequest.show 
  })

  server.route({
    method: "POST",
    path: "/invoices/{uid}/pay/bip70/bch",
    handler: handlers.BchPaymentRequestProtobuf.create,
    config: {
      payload: {
        output: 'data',
        parse: false
      }
    }
  })

  server.route({
    method: "POST",
    path: "/payments/edge/BCH/{uid}",
    handler: handlers.BchPaymentRequestProtobuf.createEdge
  })

  server.route({
    method: "POST",
    path: "/invoices/{uid}/pay/bip70/dash",
    handler: handlers.DashPaymentRequestProtobuf.create,
    config: {
      payload: {
        output: 'data',
        parse: false
      }
    }
  });

  server.route({
    method: "POST",
    path: "/invoices/{uid}/pay/bip70/btc",
    handler: handlers.BtcPaymentRequestProtobuf.create,
    config: {
      payload: {
        output: 'data',
        parse: false
      }
    }
  });

  server.route({
    method: "GET",
    path: "/r/{uid}",
    handler: handlers.BsvPaymentRequest.show 
  })

  server.route({
    method: "GET",
    path: "/csv/r",
    options: {
      handler: handlers.CsvPaymentRequest.show,
      validate: {
        query: {
          csv_url:  Joi.string().required()
        }
      }
    }
  })

  server.route({
    method: "POST",
    path: "/invoices/{uid}/pay/bip270/bsv",
    handler: handlers.BsvPaymentRequest.create 
  })

  server.route({
    method: "POST",
    path: "/invoices/{uid}/dashtext_payments",
    handler: handlers.DashtextPayments.create,
    options: {
      tags: ['api']
    }
  });

  server.route({
    method: "POST",
    path: "/invoices/{uid}/cointext_payments",
    handler: handlers.Cointext.create,
    options: {
      tags: ['api']
    }
  });

  server.route({
    method: 'POST',
    path: '/moneybutton/webhooks',
    handler: handlers.MoneybuttonWebhooks.create
  });

  server.route({
    method: 'GET',
    path: '/dashwatch/reports/{month}',
    handler: handlers.DashwatchReports.reportForMonth
  });

  server.route({
    method: 'GET',
    path: '/merchants',
    handler: handlers.Merchants.listActiveSince
  });

  server.route({
    method: 'GET',
    path: '/active-merchants',
    handler: handlers.Merchants.listActiveSince
  });

  server.route({
    method: 'GET',
    path: '/active-merchant-coins',
    handler: handlers.Merchants.listMerchantCoins
  });

  // DEPRECATED
  server.route({
    method: 'GET',
    path: '/address_routes/{input_currency}/{input_address}',
    options: {
      auth: "authoracle"
    },
    handler: handlers.AddressRoutes.show
  });

  server.route({
    method: 'GET',
    path: '/sms_numbers',
    options: {
      auth: "token"
    },
    handler: handlers.SmsNumbers.index
  });

  server.route({
    method: 'DELETE',
    path: '/sms_numbers/{id}',
    handler: handlers.SmsNumbers.destroy,
    options: {
      auth: "token"
    }
  });

  server.route({
    method: 'POST',
    path: '/sms_numbers',
    handler: handlers.SmsNumbers.create,
    options: {
      auth: "token",
      validate: {
        payload: Joi.object().keys({
          phone_number: Joi.string().required(),
          name: Joi.string()
        })
      }
    }
  });

  server.route({
    method: "GET",
    path: "/accounts/roi",
    options: {
      auth: "token",
      tags: ['api'],
      handler: handlers.Accounts.calculateROI
    }
  });

  server.route({
    method: "GET",
    path: "/kiosks",
    options: {
      auth: "token",
      tags: ['api'],
      handler: handlers.Kiosks.index
    }
  });

  server.route({
    method: "GET",
    path: "/kiosks/{kiosk_id}/transactions",
    options: {
      auth: "token",
      tags: ['api'],
      handler: handlers.KioskTransactions.index
    }
  });

  server.route({
    method: "GET",
    path: "/square/locations",
    options: {
      auth: "token",
      tags: ['api'],
      handler: handlers.SquareLocations.index
    }
  });

  server.route({
    method: "GET",
    path: "/square/locations/{location_id}",
    options: {
      auth: "token",
      tags: ['api'],
      handler: handlers.SquareLocations.show
    }
  });

  server.route({
    method: "GET",
    path: "/square/locations/{location_id}/orders",
    options: {
      auth: "token",
      tags: ['api'],
      handler: handlers.SquareOrders.index
    }
  });

  server.route({
    method: "GET",
    path: "/square/orders/{order_id}",
    options: {
      auth: "token",
      tags: ['api'],
      handler: handlers.SquareOrders.show
    }
  });

  server.route({
    method: "GET",
    path: "/square/catalog",
    options: {
      auth: "token",
      tags: ['api'],
      handler: handlers.SquareCatalogObjects.index
    }
  });

  server.route({
    method: "GET",
    path: "/square/catalog/{object_id}",
    options: {
      auth: "token",
      tags: ['api'],
      handler: handlers.SquareCatalogObjects.show
    }
  });

  server.route({
    method: "POST",
    path: "/firebase_token",
    options: {
      auth: "token",
      tags: ['api'],
      handler: handlers.FirebaseTokens.create
    }
  });

  server.route({
    method: "PUT",
    path: "/firebase_token",
    options: {
      auth: "token",
      tags: ['api'],
      handler: handlers.FirebaseTokens.update
    }
  });

  server.route({
    method: "GET",
    path: "/currency-map",
    options: {
      handler: handlers.CurrencyMap.index
    }
  });

  server.route({
    method: 'POST',
    path: '/dash/watch_addresses',
    options: {
      auth: "token"
    },
    handler: handlers.DashWatchAddresses.create
  }); 

  server.route({
    method: 'GET',
    path: '/leaderboard',
    handler: handlers.Leaderboard.index
  }); 

  accountCSVReports(server);

  server.route({
    method: 'GET',
    path: '/{param*}',
    handler: {
      directory: {
        path: '.',
        redirectToSlash: true,
        index: true,
      }
    }
  });

  return server;

}

if (require.main === module) {

  start();
}

async function start () {

  ActivateDeactivateCoinActor.start();

  await sequelize.sync()

  var server = await Server();

  // Start the server
  await server.start();

  log.info("Server running at:", server.info.uri);

}

export { Server, start }

