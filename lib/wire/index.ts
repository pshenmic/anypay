
import { models } from '../models';

import * as moment from 'moment';

import { readFileSync } from 'fs';

import { Op } from 'sequelize';

import * as Handlebars from 'handlebars';

import { join } from 'path';

async function getInvoicesByDates(accountId, start, end) {

  let invoices = await models.Invoice.findAll({

    where: {

      account_id: accountId,

      complete: true,

      completed_at: {

        [Op.gte]: start,

        [Op.lt]: end

      }

    }

  });

  invoices = invoices.map(invoice => {

    if (!invoice.cashback_denomination_amount) {

      invoice.cashback_denomination_amount = 0;
    }

    invoice.completed = moment(invoice.completed_at).format('MM/DD/YYYY');

    return invoice;

  });

  return invoices;
}

async function getInvoices(invoiceUID: string) {

  /*:
   * 1) Check to see when last invoice was
   *   - here provided by command line
   *   - will be provided manually Derrick
   */

  let invoice = await models.Invoice.findOne({ where: { uid: invoiceUID }});

  let account = await models.Account.findOne({
    where: { id: invoice.account_id }
  });

  let invoices = await models.Invoice.findAll({

    where: {

      account_id: account.id,

      complete: true,

      completed_at: {

        [Op.gt]: invoice.completed_at

      }

    }

  });

  invoices = invoices.map(invoice => {

    if (invoice.status !== 'paid') {

      invoice.cashback_denomination_amount = 0;

    }

    if (!invoice.cashback_denomination_amount) {

      invoice.cashback_denomination_amount = 0;
    }

    invoice.completed = moment(invoice.completed_at).format('MM/DD/YYYY');

    return invoice;

  });

  return invoices;

}

export async function buildWireEmailReport(invoiceUID: string) {

  let templateSource = readFileSync(join(__dirname, './template.hbs'));

  let template = Handlebars.compile(templateSource.toString('utf8'));

  let invoices = await getInvoices(invoiceUID);

  let total = invoices.reduce(function(acc, invoice) {

    acc += invoice.settlement_amount;

    return acc;

  }, 0);

  let start_date = moment(invoices[0].completed_at).format('MM-DD-YYYY');
  let end_date = moment(invoices[invoices.length - 1].completed_at).format('MM-DD-YYYY');

  let content = template({
    reportCSVURL: `https://api.sudo.anypay.global/api/wires/reportsinceinvoice/${invoiceUID}/csv`,
    invoices,
    total,
    start_date,
    end_date
  });

  return content;

}

export async function buildReportCsv(invoices: any[], filepath: string): Promise<string> {

  const createCsvStringifier = require('csv-writer').createObjectCsvStringifier;
  const csvStringifier = createCsvStringifier({
    path: filepath,
    header: [
      {id: 'created_at', title: 'Created at'},
      {id: 'denomination_amount', title: 'Amount Invoiced'},
      {id: 'denomination_amount_paid', title: 'Amount Paid (USD)'},
      {id: 'cashback_denomination_amount', title: 'Minus Dash Back (USD)'},
      {id: 'settlement_amount', title: 'Account Gets (USD)'},
      {id: 'external_id', title: 'Reference'},
      {id: 'uid', title: 'Invoice ID'}
    ]
  });

  let header = await csvStringifier.getHeaderString();

  let records = await csvStringifier.stringifyRecords(invoices.map((invoice: any) => {

    invoice.paid_at = moment(invoice.completed_at).format('MM/DD/YYYY');

    return invoice;
    
  }));

  return `${header}\t${records}`;

}

export async function buildReportCsvFromDates(accountId, start, end) {

  let invoices = await getInvoicesByDates(accountId, start, end);

  let filepath = join(__dirname,
  `../../.tmp/account-${accountId}-${start}-${end}.csv`);

  return buildReportCsv(invoices, filepath);

}

export async function buildAllTimeReport(accountId) {

  let invoices = await models.Invoice.findAll({ where: {account_id: accountId }});

  invoices = invoices.map(invoice => {
    var i = invoice.toJSON();
    i.created_at = moment(i.createdAt).format("MM/DD/YYYY");
    return i;
  });

  let filepath = join(__dirname, `../../.tmp/account-${accountId}-complete-history.csv`);

  return buildReportCsv(invoices, filepath);

}

export async function buildReportCsvFromInvoiceUID(invoiceUid: string): Promise<string> {

  let invoices = await getInvoices(invoiceUid);

  let filepath = join(__dirname, `../../.tmp/${invoiceUid}.csv`);

  return buildReportCsv(invoices, filepath);

}


