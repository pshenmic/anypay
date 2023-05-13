
import { polygon } from 'usdc'

import { Transaction } from 'ethers'

const Web3 = require('web3')

const web3 = new Web3(new Web3.providers.HttpProvider(process.env.infura_polygon_url))

export async function validateAddress(address: string): Promise<boolean> {

  return polygon.isAddress({ address })

}

class BitcoreTransaction {
  hex: string;
  transaction: Transaction | { hash: string };
  constructor(hex) {

      this.hex = hex

      if (hex.length === 66) {

        this.transaction = { hash: hex }

      } else {

        this.transaction = polygon.decodeTransactionHex({ transactionHex: hex })

      }

  }

  get hash() {
      return this.transaction.hash
  }
  toJSON() {
      return {
          hash: this.hash,
          hex: this.hex
      }
  }
}

interface VerifyPayment {
  payment_option: any;
  transaction: {
      tx: string;
  };
  protocol: string;
}

export async function verifyPayment({ payment_option, transaction: {tx: hex}, protocol }: VerifyPayment) {

  /*

    Determine whether "hex" is a full raw transaction or a txid

    If it is a txid, fetch the transaction details from the blockchain

  */

  const expectedOutput = payment_option.outputs[0]

  console.log(expectedOutput)

  try {

    return false

  } catch(error) {

    const txid = hex

    const { parsed, full } = await polygon.fetchERC20Transfer({ txid })

    console.log({ parsed, full })

    const result: any = await web3.eth.getTransaction(txid)

    console.log(result)

    return false

  }

}

export async function broadcastTx(txhex: string) {

  if (txhex.length === 66) {

    console.log('skip MATIC broadcast of txid', { txid: txhex })

    return txhex

  }

  const web3 = new Web3(new Web3.providers.HttpProvider(process.env.infura_polygon_url))

  const transmitResult: any = await web3.eth.sendSignedTransaction(txhex)

  console.log('polygon.provider.sendTransaction.result', transmitResult)

  return transmitResult

}

class Bitcore {

  get Transaction() {
      return BitcoreTransaction
  }

}


const bitcore = new Bitcore()

export { bitcore }

