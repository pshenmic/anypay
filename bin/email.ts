#!/usr/bin/env ts-node

import { Command } from 'commander';
const program = new Command();

import { sendInvoiceToEmail, firstAddressSetEmail, firstInvoiceCreatedEmail } from '../lib/email';
import { models } from '../lib/models';
import { email as rabbiEmail } from 'rabbi';

program
  .command('first_address_set <email>')
  .action(async (email) => {

    let account = await models.Account.findOne({ where: { email }})

    await firstAddressSetEmail(account)

    process.exit(0)
  
  })
program
  .command('one_day_after_signup <email>')
  .action(async (email) => {

    let account = await models.Account.findOne({ where: { email }})

    await rabbiEmail.sendEmail('one_day_after_signup', email, 'Anypay<support@anypayx.com>', account)

    process.exit(0)
  
  })

program
  .command('accountcreated <email_address>')
  .action(async (email) => {

    try {

      let resp = await rabbiEmail.sendEmail('welcome', email, 'support@anypayx.com', {
        email 
      })

      console.log(resp);

    } catch(error) {

      console.log(error);

    }

    process.exit(0);

  });

program
  .command('send_invoice <uid> <email_address>')
  .action(async (uid, email) => {

    try {

      let resp = await sendInvoiceToEmail(uid, email)

      console.log(resp);

    } catch(error) {

      console.log(error);

    }

    process.exit(0);

  });

program
  .command('first_invoice_created <email_address>')
  .action(async (email) => {

    try {

      let resp = await firstInvoiceCreatedEmail(email)

      console.log(resp);

    } catch(error) {

      console.log(error);

    }

    process.exit(0);

  });

program
  .command('invoice_paid_receipt <uid>')
  .action(async (uid) => {

    let invoice = await models.Invoice.findOne({ where: { uid }})
    let account = await models.Account.findOne({ where: { id: invoice.account_id }})

    try {

      let resp = await rabbiEmail.sendEmail('invoice_paid_receipt', account.email, 'support@anypayx.com', {
        invoice,
        account,
        email: account.email
      })

      console.log(resp);

    } catch(error) {

      console.log(error);

    }

    process.exit(0);

  })

program.parse(process.argv);

