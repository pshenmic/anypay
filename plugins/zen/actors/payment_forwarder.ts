require('dotenv').config();

import { connect } from 'amqplib';

import { log } from '../../../lib/logger';

import { forwardPayment } from '../lib/forwards';

const queue = 'zen.forwarder.payments';

const exchange = 'anypay.payments';

const routingKey = 'payment';

async function start() {

  let connection = await connect(process.env.AMQP_URL); 

  let channel = await connection.createChannel();

  await channel.assertQueue(queue);

  await channel.bindQueue(queue, exchange, routingKey);

  await channel.prefetch(1);

  channel.consume(queue, async (message) => {
    
    let content = message.content.toString();

    log.info('amqp.message.content', content);

    let payment = JSON.parse(content);
    
    log.info(queue, payment);

    if (payment.currency !== 'ZEN') {

      channel.ack(message);

      return;

    }

    try {

      log.info('try to forward payment');

      await forwardPayment(payment);

      channel.ack(message);

    } catch (error) {

      log.error(error.message);


      await sleep(1000);

      channel.nack(message);

      return;
    }

  });

}

export {
  start
};

if (require.main === module) {

  start();

}

function sleep(ms) {

  return new Promise((resolve, reject) => {

    setTimeout(resolve, ms);

  });

}
