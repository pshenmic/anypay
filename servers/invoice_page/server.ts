
import * as Hapi from "hapi";
import * as Boom from "boom";
import * as Handlebars from "handlebars";

import * as Vision from 'vision'

import { join } from 'path'

import { models, log } from '../../lib'

/*
 *
 * Single URL to fetch Invoice
 *
 *
 */

async function Server() {

  var server = new Hapi.Server({
    host: process.env.HOST || "localhost",
    port: process.env.PORT || 8200,
    routes: {
      cors: true,
      validate: {
        options: {
          stripUnknown: true
        }
      }
    }
  });

  await server.register(Vision);

  server.views({
    engines: { html: Handlebars },
    relativeTo: __dirname,
    path: 'views'
  });

  server.route({

    method: 'GET',
    path: '/s/invoices/{uid}',
    handler: (req, h) => {

      return h.view('invoice', {
        invoice: {
          uid: req.params.uid,
          amount: 1,
          business_name: 'Mighty Moose Marts'
        },
        invoiceStr: JSON.stringify({ uid: req.params.uid })
      });
    }

  })

  return server

}


Server().then(server => {

  server.start()

})



