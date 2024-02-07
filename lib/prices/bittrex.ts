
import * as http from 'superagent'

import { Price } from '../price'

export async function getPrice(currency: string): Promise<Price> {
  let pair = `${currency}-USDT`

  if (currency === 'USDT') {

    pair = `USDT-USD`

  }

  try {
    let {body} = await http.get(`https://api.bittrex.com/v3/markets/${pair}/orderbook`)

    let value = parseFloat(body.bid[0].rate)

    return {
      base: 'USD',
      currency,
      value,
      source: 'bittrex'
    }
  } catch (e) {
    throw new Error(`Failed to obtain Bittrex USD price for ${currency}: ${e}`)
  }

}
