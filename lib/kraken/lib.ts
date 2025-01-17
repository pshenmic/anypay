
import { database, models, log } from '../../lib';

export async function getDASHBalance(kraken) {

  let balance = await kraken.api('Balance');

  return parseFloat(balance.result.DASH);

}

export async function getBalancesBreakdown(kraken) {

  /* Available balances, meaning they are available for placing orders */

  let balances = await getBalances(kraken);

  let orders = await listOpenOrders(kraken);

  let locked = Object.values(orders.result.open).reduce((accumulator, order: any) => {

    if (!accumulator[order.descr.pair]) {

      accumulator[order.descr.pair] = 0;

    }

    accumulator[order.descr.pair] += parseFloat(order.vol);

    return accumulator;

  }, {});

  return Object.keys(balances).map((pair) => {
    var lockedpair = pair;

    if (!pair.match(/^X/)) {
      lockedpair = `${pair}USD`;
    }

    let balance = parseFloat(balances[pair]);
    let lock = parseFloat(locked[lockedpair]) || 0;

    return {

      currency: lockedpair,

      balance,

      locked: lock,

      available: balance - lock

    };

  });

}

export async function getBalances(kraken) {

  let balance = await kraken.api('Balance');

  return balance.result;

}

export async function listOpenOrders(kraken): Promise<any> {

  let openOrders = await kraken.api('OpenOrders');

  return openOrders;

}

export async function getTicker(kraken, pair) {

  let ticker = await kraken.api('Ticker', { pair });

  return ticker;

}

export async function cancelOrder(kraken, txid) {

  let result = await kraken.api('CancelOrder', { txid });

  return result;

}

export async function getOpenPositions(kraken) {

  let openPositions = await kraken.api('OpenPositions');

  return openPositions;

}

export async function listClosedOrders(kraken) {

  let closedOrders = await kraken.api('ClosedOrders');

  return closedOrders;

}

export async function listTrades(kraken, options={}) {

  options = Object.assign({
    type: 'all'
  }, options);

  let trades = await kraken.api('TradesHistory', options);

  return trades;

}

export async function listBankAccounts(kraken, options={}) {

  options = Object.assign({
    type: 'all'
  }, options);

  let info = await kraken.api('WithdrawInfo', options);

  return info;

}

export async function withdrawStatus(kraken, options={}) {

  options = Object.assign({
    asset: 'USD',
  }, options);

  let info = await kraken.api('WithdrawStatus', options);

  return info;

}

const USD_WITHDRAW_ACCOUNT_NAME = process.env.KRAKEN_WITHDRAW_KEY || '???'

export async function withdrawInfo(kraken, options={}) {

  options = Object.assign({
    amount: 1000,
    asset: 'USD',
    key: USD_WITHDRAW_ACCOUNT_NAME
  }, options);

  let info = await kraken.api('WithdrawInfo', options);

  return info;

}

export async function withdrawAllUSD(kraken, options: any={}) {

  let balances = await getAccountBalance(kraken)

  let balance = parseFloat(balances.result['ZUSD'])

  if (balance > 1000) {

    return withdrawUSD({ amount: balance })

  }

}
 

export async function withdrawUSD(kraken, options: any={}) {

  options = Object.assign({
    amount: options.amount,
    asset: 'ZUSD',
    key: USD_WITHDRAW_ACCOUNT_NAME
  }, options);

  let info = await kraken.api('Withdraw', options);

  return info;

}

export async function getAccountBalance(kraken) {

  let balance = await kraken.api('Balance');

  return balance;

}

export async function getTradeBalance(kraken) {

  let balance = await kraken.api('TradeBalance');

  return balance.result;

}

export async function getUSDBalance(kraken) {

  let balance = await kraken.api('Balance');

  return parseFloat(balance.result.ZUSD);

}

export async function transferAllUSDToBank(kraken) {

  let usdBalance = await getUSDBalance(kraken);

  let withdrawal = await kraken.api('Withdraw', {
    asset: 'USD',
    key: 'TD Bank Portsmouth',
    amount: usdBalance
  });

  return withdrawal.result;

}
export async function marketSell(kraken, pair, volume) {

  let result = await kraken.api('AddOrder', {

    pair,

    type: 'sell',

    ordertype: 'market',

    volume

  }); 

  return result;

}

export async function sellStopLoss(kraken, pair, price, volume) {

  let result = await kraken.api('AddOrder', {

    pair,

    price,

    type: 'sell',

    ordertype: 'stop-loss',

    volume

  }); 

  return result;

}

export async function sellAllDASH(kraken) {

  let balance = await getDASHBalance(kraken);

  if (balance > 0) {

    let result = await kraken.api('AddOrder', {

      pair: 'DASHUSD',

      type: 'sell',

      ordertype: 'market',

      volume: balance

    }); 

    return result;

  } else {

    return;

  }

}

export async function sellAllOfPair(kraken, pair, balance) {

  if (balance > 0) {

    let result = await kraken.api('AddOrder', {

      pair,

      type: 'sell',

      ordertype: 'market',

      volume: parseFloat(balance)

    }); 

    return result;

  } else {

    return;

  }

}

export async function syncAllNewTrades(kraken) {

  var newTrades = [true];

  while (newTrades.length > 0) {

    newTrades = await syncNewTrades(kraken);

    log.info('kraken.trades', {message: `${newTrades.length} new trades recorded`});

  }

}
  

export async function syncNewTrades(kraken) {

  let tradeCount = await database.query(`select count(*) from "KrakenTrades";`);

  let offset = parseInt(tradeCount[0][0].count)

  let response = await listTrades({ ofs: offset });

  let newTrades = await Promise.all(Object.keys(response.result.trades).map(async (tradeId) => {

    let trade = response.result.trades[tradeId];

    let [record, isNew] = await models.KrakenTrade.findOrCreate({

      where: {
        ordertxid: trade.ordertxid            
      },

      defaults: trade

    });

    if (isNew) {

      return record;
    }

  }));

  newTrades = newTrades.filter(t => !!t);

  return newTrades;

}


