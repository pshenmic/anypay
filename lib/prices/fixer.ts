require('dotenv').config();

import * as http from 'superagent';

import { BigNumber } from 'bignumber.js'

const apiKey = process.env.ANYPAY_FIXER_ACCESS_KEY;

import { Price } from '../price'

export async function fetchCurrencies(base='USD'): Promise<Price[]> {

  base = base.toLowerCase();

  const url = `http://data.fixer.io/api/latest?access_key=${apiKey}&base=${base}`;

  let response = await http.get(url);

  let rates = response.body.rates || {};

  return Object.keys(rates).map((currency) => {

     return {
       base: base.toUpperCase(),
       currency: currency,
       value: new BigNumber(1).dividedBy(rates[currency]).toNumber(),
       source: 'data.fixer.io/api/latest'
     }
  })

}

