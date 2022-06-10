
require('dotenv').config();

import * as Hapi from "@hapi/hapi";

const Inert = require('@hapi/inert');

const Vision = require('@hapi/vision');

const HapiSwagger = require("hapi-swagger");

import { attachV1Routes } from '../v1/routes';

import { attachRoutes as attachJsonV2 } from '../jsonV2/routes';

import { join } from 'path'

import { log } from '../../lib/log';

import { validateToken, validateAdminToken, validateAppToken } from '../auth/hapi_validate_token';

import { bcryptCompare } from '../../lib/password';

import { accountCSVReports } from './handlers/csv_reports';

import * as payreq from '../payment_requests/server'

import { v0, failAction } from '../handlers'

const AccountLogin = require("../../lib/account_login");

const sequelize = require("../../lib/database");

import * as Joi from '@hapi/joi';

import { models } from '../../lib'

const validatePassword = async function(request, username, password, h) {

  try {

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


    var accessToken = await AccountLogin.withEmailPassword(username, password);

    if (accessToken) {

      return {
        isValid: true,
        credentials: { accessToken, account }
      };

    } else {


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

  return {
    isValid: true,
    credentials: { accessToken, account }
  }

};

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


const server = new Hapi.Server({
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

async function Server() {

  server.ext('onRequest', function(request, h) {

    log.debug('server.request', { id: request.info.id, headers: request.headers })

    if ('application/payment' === request.headers['content-type']) {
      request.headers['content-type'] = 'application/json';
      request.headers['x-content-type'] = 'application/payment';
    }

    if ('application/payment-request' === request.headers['content-type']) {
      request.headers['content-type'] = 'application/json';
      request.headers['x-content-type'] = 'application/payment-request';
    }

    if ('application/payment-verification' === request.headers['content-type']) {
      request.headers['content-type'] = 'application/json';
      request.headers['x-content-type'] = 'application/payment-verification';
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
  await server.register(Inert);
  await server.register(Vision);
  await server.register(require('hapi-boom-decorators'))

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

  server.auth.strategy("token", "basic", { validate: validateToken });
  server.auth.strategy("app", "basic", { validate: validateAppToken });
  server.auth.strategy("password", "basic", { validate: validatePassword });
  server.auth.strategy("adminwebtoken", "basic", { validate: validateAdminToken });

  payreq.attach(server)

  attachJsonV2(server)

  server.route({
    method: "GET",
    path: "/api/accounts-by-email/{email}",
    handler: v0.Anypaycity.show
  });

  server.route({
    method: "GET",
    path: "/invoices/{invoice_id}",
    handler: v0.Invoices.show,
    options: {
      tags: ['api'],
      validate: {
        params: Joi.object({
          invoice_id: Joi.string().required()
        }),
        failAction
      },
      plugins: responsesWithSuccess({ model: models.Invoice.Response })
    }
  });



  server.route({
    method: "GET",
    path: "/woocommerce",
    handler: v0.Woocommerce.index,
    options: {
      auth: "token",
      tags: ['api']
    }
  });

  server.route({
    method: "GET",
    path: "/invoices/{invoice_uid}/payment_options",
    handler: v0.InvoicePaymentOptions.show,
    options: {
      tags: ['api']
    }
  });


  server.route({
    method: "POST",
    path: "/invoices/{uid}/share/email",
    handler: v0.Invoices.shareEmail,
    options: {
      tags: ['api'],
      validate: {
        payload: Joi.object({
          email: Joi.string().email().required()
        }),
        failAction
      }
    }
  });

  server.route({
    method: "GET",
    path: "/grab_and_go_items",
    handler: v0.Products.index,
    options: {
      auth: "token",
      tags: ['api']
    }
  });


  server.route({
    method: "GET",
    path: "/invoices",
    handler: v0.Invoices.index,
    options: {
      auth: "token",
      tags: ['api']
    }
  });

  server.route({
    method: "POST",
    path: "/accounts",
    handler: v0.Accounts.create,
    options: {
      tags: ['api'],
      validate: {
        payload: models.Account.Credentials,
        failAction
      },
      plugins: responsesWithSuccess({ model: models.Account.Response }),
    },
  });
  server.route({
    method: "GET",
    path: "/accounts/{id}", // id or email
    handler: v0.Accounts.showPublic,
    options: {
      tags: ['api'],
      plugins: responsesWithSuccess({ model: models.Account.Response }),
    },
  });

  server.route({
    method: "PUT",
    path: "/anonymous-accounts",
    handler: v0.Accounts.registerAnonymous,
    options: {
      auth: "token",
      tags: ['api'],
      validate: {
        payload: models.Account.Credentials,
        failAction
      },
      plugins: responsesWithSuccess({ model: models.Account.Response }),
    },
  });

  server.route({
    method: "POST",
    path: "/anonymous-accounts",
    handler: v0.Accounts.createAnonymous,
    options: {
      tags: ['api']
    },
  });

  server.route({
    method: "POST",
    path: "/access_tokens",
    handler: v0.AccessTokens.create,
    options: {
      auth: "password",
      tags: ['api'],
      plugins: responsesWithSuccess({ model: models.AccessToken.Response })
    }
  });

  server.route({
    method: "GET",
    path: "/addresses",
    handler: v0.Addresses.list,
    options: {
      auth: "token",
      tags: ['api'],
      plugins: responsesWithSuccess({ model: v0.Addresses.PayoutAddresses }),
    }
  });

  server.route({
    method: "DELETE",
    path: "/addresses/{currency}",
    handler: v0.Addresses.destroy,
    options: {
      auth: "token",
      tags: ['api']
    }
  });

  server.route({
    method: "GET",
    path: "/account_addresses",
    handler: v0.Addresses.index,
    options: {
      auth: "token",
      tags: ['api']
    }
  });

  server.route({
    method: "PUT",
    path: "/addresses/{id}/notes",
    handler: v0.AddressNotes.update,
    options: {
      auth: "token",
      tags: ['api'],
      validate: {
        params: Joi.object({
          id: Joi.number().required()
        }),
        payload: Joi.object({
          note: Joi.string().required()
        }),
        failAction
      }
    }
  });

  server.route({
    method: "POST",
    path: "/v0/search",
    handler: v0.Search.create,
    options: {
      auth: "token",
      tags: ['api', 'invoices'],
      validate: {
        payload: Joi.object({
          search: Joi.string().required()
        }),
        failAction
      }
    }
  });

  server.route({
    method: "PUT",
    path: "/addresses/{currency}",
    handler: v0.Addresses.update,
    options: {
      auth: "token",
      tags: ['api'],
      validate: {
        params: Joi.object({
          currency: Joi.string().required()
        }),
        payload: Joi.object({
          address: Joi.string().required()
        }),
        failAction
      }
    }
  });

  server.route({
    method: "GET",
    path: "/account",
    handler: v0.Accounts.show,
    options: {
      auth: "token",
      tags: ['api'],
      plugins: responsesWithSuccess({ model: models.Account.Response }),
    }
  });

  server.route({
    method: "PUT",
    path: "/account",
    handler: v0.Accounts.update,
    options: {
      auth: "token",
      tags: ['api']
    }
  });

  server.route({
    method: "POST",
    path: "/invoices/{invoice_uid}/notes",
    handler: v0.InvoiceNotes.create,
    options: {
      validate: {
        payload: Joi.object({
          note: Joi.string().required()
        }),
        failAction
      },
      auth: "token",
      tags: ['api']
    }
  });


  server.route({
    method: "GET",
    path: "/coins",
    handler: v0.Coins.list,
    options: {
      tags: ['api'],
      auth: "token",
      plugins: responsesWithSuccess({ model: v0.Coins.CoinsIndexResponse }),
    }
  });


  server.route({
    method: "POST",
    path: "/invoices",
    handler: v0.Invoices.create,
    options: {
      auth: "token",
      tags: ['api'],
      validate: {
        payload: models.Invoice.Request,
        failAction
      },
      plugins: responsesWithSuccess({ model: models.Invoice.Response }),
    }
  });

  server.route({
    method: "DELETE",
    path: "/invoices/{uid}",
    handler: v0.Invoices.cancel,
    options: {
      auth: "token",
      tags: ['api']
    }
  });

  server.route({
    method: "POST",
    path: "/accounts/{account_id}/invoices",
    handler: v0.Invoices.createPublic,
    options: {
      tags: ['api'],
      validate: {
        payload: models.Invoice.Request,
        failAction
      },
      plugins: responsesWithSuccess({ model: models.Invoice.Response })
    }
  });

  server.route({
    method: "POST",
    path: "/password-resets",
    handler: v0.Passwords.reset,
    options: {
      tags: ['api'],
      validate: {
        payload: v0.Passwords.PasswordReset,
        failAction
      },
      plugins: responsesWithSuccess({ model: v0.Passwords.Success }),
    }
  });

  server.route({
    method: "POST",
    path: "/password-resets/{uid}",
    handler: v0.Passwords.claim,
    options: {
      tags: ['api'],
      validate: {
        payload: v0.Passwords.PasswordResetClaim,
        failAction
      },
      plugins: responsesWithSuccess({ model: v0.Passwords.Success }),
    }
  });

  server.route({
    method: "PUT",
    path: "/settings/denomination",
    handler: v0.Denominations.update,
    options: {
      tags: ['api'],
      auth: "token"
    }
  });

  server.route({
    method: "GET",
    path: "/settings/denomination",
    handler: v0.Denominations.show,
    options: {
      tags: ['api'],
      auth: "token"
    }
  });

  server.route({
    method: "GET",
    path: "/base_currencies",
    handler: v0.BaseCurrencies.index,
    options: {
      tags: ['api']
    }
  });

  server.route({
    method: "GET",
    path: "/convert/{oldamount}-{oldcurrency}/to-{newcurrency}",
    handler: v0.PriceConversions.show,
    options: {
      tags: ['api']
    }
  });

  server.route({
    method: "POST",
    path: "/r",
    handler: v0.PaymentRequests.create,
    options: {
      auth: "app"
    }
  })

  server.route({
    method: 'POST',
    path: '/moneybutton/webhooks',
    handler: v0.MoneybuttonWebhooks.create
  });

  server.route({
    method: 'GET',
    path: '/merchants',
    handler: v0.Merchants.listActiveSince
  });

  server.route({
    method: 'GET',
    path: '/merchants/{account_id}',
    handler: v0.Merchants.show
  });

  server.route({
    method: 'GET',
    path: '/active-merchants',
    handler: v0.Merchants.listActiveSince
  });

  server.route({
    method: 'GET',
    path: '/active-merchant-coins',
    handler: v0.Merchants.listMerchantCoins
  });

  server.route({
    method: "GET",
    path: "/apps",
    options: {
      auth: "token",
      tags: ['api'],
      handler: v0.Apps.index
    }
  });

  server.route({
    method: "GET",
    path: "/apps/{id}",
    options: {
      auth: "token",
      tags: ['api'],
      handler: v0.Apps.show
    }
  });

  server.route({
    method: "POST",
    path: "/apps",
    options: {
      auth: "token",
      tags: ['api'],
      handler: v0.Apps.create
    }
  });

  server.route({
    method: "POST",
    path: "/firebase_token",
    options: {
      auth: "token",
      tags: ['api'],
      handler: v0.FirebaseTokens.create
    }
  });

  server.route({
    method: "PUT",
    path: "/firebase_token",
    options: {
      auth: "token",
      tags: ['api'],
      handler: v0.FirebaseTokens.update
    }
  });

  server.route({
    method: 'GET',
    path: '/support/{token}',
    handler: v0.SupportProxy.show
  }); 

  server.route({
    method: 'GET',
    path: '/api_keys',
    handler: v0.ApiKeys.index,
    options: {
      auth: "token"
    }
  }); 

  server.route({
    method: 'POST',
    path: '/bittrex_api_keys',
    handler: v0.BittrexApiKeys.create,
    options: {
      auth: "token"
    }
  }); 

  server.route({
    method: 'GET',
    path: '/bittrex_api_keys',
    handler: v0.BittrexApiKeys.show,
    options: {
      auth: "token"
    }
  }); 

  server.route({
    method: 'DELETE',
    path: '/bittrex_api_keys',
    handler: v0.BittrexApiKeys.destroy,
    options: {
      auth: "token"
    }
  }); 

  server.route({
    method: 'POST',
    path: '/kraken_api_keys',
    handler: v0.KrakenApiKeys.create,
    options: {
      auth: "token"
    }
  }); 

  server.route({
    method: 'GET',
    path: '/kraken_api_keys',
    handler: v0.KrakenApiKeys.show,
    options: {
      auth: "token"
    }
  }); 

  server.route({
    method: 'DELETE',
    path: '/kraken_api_keys',
    handler: v0.KrakenApiKeys.destroy,
    options: {
      auth: "token"
    }
  }); 



  server.route({
    method: 'GET',
    path: '/search/accounts/near/{latitude}/{longitude}',
    handler: v0.Accounts.nearby
  }); 



  await attachV1Routes(server)

  accountCSVReports(server);

  server.route({
    method: 'GET',
    path: '/',
    handler: (req, h) => {
      return h.redirect('/documentation')
    }
  }); 

  return server;

}

if (require.main === module) {

  start();
}

async function start () {

  await Server();

  // Start the server
  await server.start();

  log.info(`Server running at: ${server.info.uri}`);

}

export { Server, start, server }

