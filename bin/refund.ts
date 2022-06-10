#!/usr/bin/env ts-node

require('dotenv').config();

import * as program from 'commander';

import { getAddressForInvoice, getRefund } from '../lib/refunds'

import { ensureInvoice } from '../lib/invoices'

program
  .command('getrefund <invoice_uid>')
  .action(async function(uid) {

    try {

      let invoice = await ensureInvoice(uid)

      let result = await getRefund(invoice)

      console.log(result)

    } catch(e) {

      console.log("error", e.message);
    }

  });

program
  .command('getaddress <invoice_uid>')
  .action(async function(uid) {

    try {

      let invoice = await ensureInvoice(uid)

      let result = await getAddressForInvoice(invoice)

      console.log(result)

    } catch(e) {

      console.log("error", e.message);
    }

  });

program.parse(process.argv);

