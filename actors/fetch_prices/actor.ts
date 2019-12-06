/* implements rabbi actor protocol */

require('dotenv').config();

import { Actor, Joi } from 'rabbi';

const apiKey = process.env.ANYPAY_FIXER_ACCESS_KEY;

import * as amqp from 'amqplib';

import * as http from 'superagent';

const async = require("async");

( async ()=> {

  let connection = await amqp.connect(process.env.AMQP_URL);
        
  let chan = await connection.createChannel();

  const WebSocket = require('ws');

  const ws = new WebSocket('wss://ws.kraken.com');

  let lastAsk = 0;

  let subscriptions = [{
    "event": "subscribe",
    "pair": [
      "XBT/USD"
    ],
    "subscription": {
      "name": "ticker",
    }
  }]

  ws.on('open', function open() {

    subscriptions.forEach((data)=>{
      ws.send(JSON.stringify(data))
    })

  });


  ws.on('message', function incoming(data) {

    let msg = JSON.parse(data)

    console.log(msg)

    if( msg.event === 'subscriptionStatus' ){

    }
    else if( msg.event === 'systemStatus' ){

      console.log(msg)

    }
    else if( msg.event === 'heartbeat' ){


    }
    else{

      let newAsk = msg[1].a[0];

      console.log('newAsk', newAsk)
      console.log('lastAsk', lastAsk)

      if( lastAsk / newAsk > 1.002 || lastAsk / newAsk < 0.998 ){

        console.log('prices changed .02% fetching new prices')
        chan.publish('anypay.prices', 'fetch.prices', Buffer.from('fetch prices'))

      }

      lastAsk = newAsk

    }

  });

  ws.on('close',(e)=>{

    ws.reconnect(e);

  });

  ws.on('error',(e)=>{

    ws.reconnect(e);

  });

})()

export async function start() {

  let conn = await amqp.connect(process.env.AMQP_URL)

  let chan = await conn.createChannel();

  setInterval( async ()=>{

    await chan.publish('anypay.prices', 'fetch.prices', Buffer.from('fetch prices'))        

  }, 300000)

  Actor.create({

    exchange: 'anypay.prices',

    routingkey: 'fetch.prices',

    queue: 'coinmarketcap',

  }) 
  .start(async (channel, msg) => {

    console.log('fetching coinmarketcap prices');

    let resp = await http
      .get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?limit=25') 
      .set( 'X-CMC_PRO_API_KEY',process.env.COINMARKETCAP_API_KEY);

     async.eachLimit(resp.body.data, 10, (item,callback)=>{  

       channel.publish('anypay.prices', 'price.update', Buffer.from(JSON.stringify({

         "currency": item.symbol,
         "base": "USD",
         "price": item.quote.USD.price,
         "source": 'coinmarketcap'

       })))

      callback();

     })

     channel.ack(msg);

  }); 

  Actor.create({

    exchange: 'anypay.prices',

    routingkey: 'fetch.prices',

    queue: 'fixerapi',

  })  
  .start(async (channel, msg) => {

   console.log('fetching fixer prices');

   let url = `http://data.fixer.io/api/latest?access_key=${apiKey}&base=usd`;

   let response = await http.get(url);

    if (response.body.success) {

      let rates = response.body.rates;

      console.log(rates)

      let currencies = Object.keys(rates);

      for (let i=0; i < currencies.length; i++) {

        let currency = currencies[i];

        console.log(currencies[i]);
             
        channel.publish('anypay.prices', 'price.update', Buffer.from(JSON.stringify({

          "currency": currency,
          "base" : "USD",
          "price": 1 / rates[currency],
          "source": 'fixer.io'

        })))
             

      }

    }

    channel.ack(msg);

  }); 


 Actor.create({

    exchange: 'anypay.prices',

    routingkey: 'fetch.prices',

    queue: 'dash.retail',

  })  
  .start(async (channel, msg) => {

    console.info('update DASH prices');

    let resp = await http.get('https://rates.dashretail.org/list');

    let currencies = Object.keys(resp.body);

    for (let i=0; i<currencies.length; i++) {

      let currency = currencies[i];

      let price = resp.body[currency];

      channel.publish('anypay.prices', 'price.update', Buffer.from(JSON.stringify({
        "currency": "DASH",
        "base" : currency,
        "price": price,
        "source": 'dashretail.org'
      })))

    }

    channel.ack(msg);

  }); 

 Actor.create({

    exchange: 'anypay.prices',

    routingkey: 'fetch.prices',

    queue: 'ves.price',

  })  
  .start(async (channel, msg) => {

    console.log('fetching ves prices');

    let resp = await http.get('https://api.get-spark.com/ves')

    channel.publish('anypay.prices', 'price.update', Buffer.from(JSON.stringify({
      "currency": "DASH",
      "base" : "VES",
      "price" : resp.body['VES'],
      "source": 'get-sparck.com'
    })))

    channel.ack(msg);

  });


}

if (require.main === module) {

  start();


}

