
import { models } from './models';

import { log } from './logger';

import { Invoice } from './invoices'

import { PaymentRequired } from 'get402'

import { Account, findAccount } from './account'

import { email } from 'rabbi'

import { findClient, createClient, Client } from './get_402'

import * as http from 'superagent';

export async function sendWebhookForInvoice(invoiceUid: string, type: string = 'default') {

  let invoice = await models.Invoice.findOne({ where: {
    uid: invoiceUid
  }});

  var started_at = new Date();
  var invoice_uid = invoice.uid;
  var url = invoice.webhook_url;
  var response_code, response_body, ended_at, error;
  var resp;

  var status = 'pending'

  if (invoice.webhook_url) {

    try {

      let json = invoice.toJSON();

      resp = await http.post(invoice.webhook_url).send(json);

      response_code = resp.statusCode; 

      response_body = resp.body; 

      if (typeof resp.body !== 'string') {
        response_body = JSON.stringify(resp.body); 
      } else {
        response_body = resp.body; 
      }

      ended_at = new Date();

      status = 'success'

    } catch(e) {

      response_code = e.response.statusCode;

      if (typeof e.response.body !== 'string') {
        response_body = JSON.stringify(e.response.text); 
      } else {
        response_body = e.response.body; 
      }
      error = e.message;

      ended_at = new Date();

      status = 'failed'

    }



    let webhook = await models.Webhook.create({
      account_id: invoice.account_id,
      started_at,
      invoice_uid,
      type,
      response_code,
      response_body,
      error,
      ended_at,
      url,
      status
    })

    return webhook;

  } else {

    throw new Error('no webhook_url set for invoice');

  }

}

interface FindWebhook { 
  invoice_uid: string
}

class WebhookNotFound implements Error {
  name = 'WebhookNotFound'
  message = 'webhook not found for invoice uid'
}

export class WebhookAlreadySent implements Error {
  name = 'WebhookAlreadySent'
  message = 'webhook already sent for this invoice'
}

export class ApiKeyPaymentRequired implements Error {
  name = 'ApiKeyPaymentRequired'
  message = 'webhook may not be sent without api key credits'
}

interface NewAttempt {
  record: any;
  webhook: Webhook;
}

export class Attempt {

  webhook: Webhook;

  record: any;

  constructor(params: NewAttempt) {
    this.webhook = params.webhook
    this.record = params.record
  }

  get response_code() {
    return this.record.response_code
  }

}

interface NewWebhook {
  invoice: Invoice;
  record: any;
  attempts?: Attempt[];
}

export class Webhook {

  record: any;

  attempts: Attempt[];

  invoice: Invoice;

  constructor(params: NewWebhook) {

    this.record = params.record;

    this.attempts = params.attempts;

    this.invoice = params.invoice;

  }

  async getAccount(): Promise<Account> {

    return findAccount(this.invoice.account_id)

  }

  get retry_policy(): string {
    return this.record.retry_policy
  }

  get id(): number {
    return this.record.id
  }

  get url(): string {
    return this.record.url
  }

  get success(): boolean {
    return this.record.status === 'success'
  }

  get status(): boolean {
    return this.record.status
  }

  async save() {
    return this.record.save();
  }

  invoiceToJSON() {

    return this.invoice.toJSON()

  }

}

export async function findWebhook(where: FindWebhook) {

  let record = await models.Webhook.findOne({where})

  if (!record) { throw new WebhookNotFound() }

  let invoice = await models.Invoice.findOne({ where: { uid: record.invoice_uid }})

  let attempts = await models.WebhookAttempt.findAll({

    where: { webhook_id: record.id }

  })

  return new Webhook({ record, attempts, invoice })
}

interface CreateWebhook {
  invoice_uid: string;
  url: string;
  account_id: number;
}

export async function createWebhook(where: CreateWebhook): Promise<Webhook> {

  let [webhook] = await models.Webhook.findOrCreate({where, defaults: where})

  if (!webhook) { throw new WebhookNotFound() }

  return new Webhook(webhook)

}

export class WebhookFailed implements Error {
  name = 'WebhookFailed'
  message = 'webhook failed'
  attempt: Attempt;

  constructor(attempt: Attempt) {
    this.attempt = attempt
  }
}

export async function attemptWebhook(webhook: Webhook): Promise<Attempt> {

  if (webhook.success) {

    throw new WebhookAlreadySent()
  }

  let record = await models.WebhookAttempt.create({
    webhook_id: webhook.id
  })

  record.start_time = new Date()

  record.started_at = new Date();

  var response_code, response_body, ended_at, error;
  var resp;

  let attemp = new Attempt({record, webhook})

  webhook.attempts.push(attemp)

  let json = webhook.invoiceToJSON();

  try {

    resp = await http.post(webhook.url).send(json);

    record.response_code = resp.statusCode; 

    record.response_body = resp.body; 

    if (typeof resp.body !== 'string') {

      record.response_body = JSON.stringify(resp.body); 

    } else {

      record.response_body = resp.body; 
    }

    record.ended_at = new Date();

    webhook.record.status = 'success'

  } catch(e) {

    if (e.response) {

      record.response_code = e.response.statusCode;

      if (typeof e.response.body !== 'string') {

        record.response_body = JSON.stringify(e.response.text); 

      } else {

        record.response_body = e.response.body; 

      }

    }
    record.error = e.message;

    record.ended_at = new Date();

    webhook.record.status = 'failed'

  }

  await Promise.all([record.save(), webhook.save()])

  return new Attempt({record, webhook})

}

export interface ApiClient {
  identifier: string;
}



export class PaidWebhook {

  client: Client;

  webhook: Webhook

  constructor(params: NewPaidWebhook) {

    this.client = createClient(params.client.identifier);

    this.webhook = params.webhook;

  }

  async attemptWebhook(): Promise<Attempt> {

    try {

      await this.client.chargeCredit({ credits: 1 })

      return attemptWebhook(this.webhook)

    } catch(error) {

      if (error instanceof PaymentRequired) {

        let account = await this.webhook.getAccount()

        await email.sendEmail('get402-insufficient-funds', account.email, 'noreply@anypayx.com')

      }

      throw error

    }

  }

}

interface NewPaidWebhook {
  webhook: Webhook,
  client: ApiClient
}

export function makePaidWebhook(params: NewPaidWebhook): PaidWebhook {

  return new PaidWebhook(params)

}
export async function getPaidWebhookForInvoice(invoice: Invoice): Promise<PaidWebhook> {

  let account = await invoice.getAccount()

  let client = await findClient(account)

  if (!client) {

    return null
  }

  let webhook = await findWebhook({ invoice_uid: invoice.uid })

  return makePaidWebhook({ webhook, client })
}

interface ListOptions {
  limit?: number;
  offset?: number;
}

export async function listForAccount(account: Account, options: ListOptions = {}): Promise<any[]> {

  let webhooks = await models.Webhook.findAll({
    where: { account_id: account.id },
    offset: options.offset,
    limit: options.limit,
    include: [{
      model: models.WebhookAttempt,
      as: 'attempts'
    }]
  })

  return webhooks

}

