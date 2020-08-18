require('dotenv');
import { models } from '../models';
import { log } from '../logger';
const filepay = require('filepay')

const ENERGY_CITY_BITCOM = '1DRHWrL1jPjH8V7V4E3TxpS63E6a24ysnN';
const ENERGY_CITY_BITCOM_PRIVKEY = process.env.ENERGY_CITY_BITCOM_PRIVKEY;

import { rpc } from '../../plugins/bsv/lib/jsonrpc';

export function publishReceipt(id: number) {

  return new Promise(async (resolve, reject) => {

    let receipt = await models.BlockchainReceipt.findOne({ where: { id }});

    if (!receipt) {
      throw new Error('receipt not found');
    }

    if (receipt.published_at && receipt.txid) {
      throw new Error(`receipt already published ${receipt.txid}`);
    }

    let invoice = await models.Invoice.findOne({ where: { uid: receipt.invoice_uid }});

    let data=  [ENERGY_CITY_BITCOM, 'invoice.paid', invoice.uid, invoice.hash];

    log.info("DATA", data);
    log.info("KEY", ENERGY_CITY_BITCOM_PRIVKEY);

    filepay.build({

      data: [ENERGY_CITY_BITCOM, 'invoice.paid', invoice.uid, invoice.hash],

      pay: { key: ENERGY_CITY_BITCOM_PRIVKEY }

    }, async function(err, tx) {

      try {

        log.info('tx', tx); 

        receipt.hex = tx.toString();

        await receipt.save();

        let resp = await rpc.call('sendrawtransaction', [tx.toString()]);

        log.info('resp', resp);

        receipt.txid = resp.result;
        receipt.published_at = new Date();

        await receipt.save();

        log.info('published', resp);

        resolve(receipt);

      } catch(error) {

        receipt.error = error.message;
        await receipt.save();
        reject(error);

      }

    })

  });

}
