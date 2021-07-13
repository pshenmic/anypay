const btc = require('bitcore-lib');
const bch = require('bitcore-lib-cash');
const ltc = require('litecore-lib');
const doge = require('bitcore-doge-lib');
const dash = require('@dashevo/dashcore-lib');
const bsv = require('bsv');

import { BigNumber } from 'bignumber.js';

export function getBitcore(currency) {

  switch(currency) {
  case 'BTC':
    return btc;
  case 'LTC':
    return ltc;
  case 'BCH':
    return bch;
  case 'DASH':
    return dash;
  case 'BSV':
    return bsv;
  case 'DOGE':
    return doge;
  }

}

export function toSatoshis(amount): number{
  let amt = new BigNumber(amount); 
  let scalar = new BigNumber(100000000);

  return amt.times(amount).toNumber();
}

