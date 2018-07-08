import { getLegacyPrices } from './legacy';
import { getCryptoPrices } from './crypto';

interface Amount {
  currency: string;
  value: number;
}

interface Conversion {
  input: Amount;
  output: Amount;
  timestamp: Date
}

async function getAllPrices() {
  let legacyPrices = await getLegacyPrices();
  let cryptoPrices = await getCryptoPrices();

  return Object.assign(legacyPrices, cryptoPrices);
}

async function createConversion(inputAmount: Amount, outputCurrency: string): Promise<Conversion> {
  let input = inputAmount;
  let output = await convert(inputAmount, outputCurrency);
  let timestamp = new Date();

  return {
    input,
    output,
    timestamp
  }
}

async function convert(inputAmount: Amount, outputCurrency: string): Promise<Amount> {

  let prices = await getAllPrices();
  let rate = prices[outputCurrency] / prices[inputAmount.currency];

  let targetAmount = inputAmount.value * rate;

  return {
    currency: outputCurrency,
    value: targetAmount
  }
}

export {
  convert, createConversion
}