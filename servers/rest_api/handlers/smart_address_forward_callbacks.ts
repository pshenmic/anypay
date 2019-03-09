import { log } from '../../../lib';

import { channel } from '../../../lib/amqp';

export async function create(req, h) {

  log.info('smart.addressforwardcallback', req.payload);

  let payment = {
    currency: "SMART",
    amount: req.payload.value,
    address: req.payload.input_address,
    hash: req.payload.input_transaction_hash,
    output_hash: req.payload.destination_transaction_hash,
    locked: req.payload.locked || false
  }

  log.info('smart.payment', payment);

  let buffer = new Buffer(JSON.stringify(payment));

  await channel.publish('anypay.payments', 'payment', buffer);

  return payment;

}

