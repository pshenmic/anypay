
import { expect } from 'chai'

import { find } from '../../lib/plugins'

describe('SOL', () => {

  it('should find the plugin for SOL', async () => {

    let plugin = await find({ chain: 'SOL', currency: 'SOL' })

    expect(plugin.currency).to.be.equal('SOL')

    expect(plugin.chain).to.be.equal('SOL')

  })

  it('#getConfirmation should return block data for confirmed transaction', async () => {

    let plugin = await find({ chain: 'SOL', currency: 'SOL' });

    let txid = 'sva4wpWvkuE2vLeGDHdDdxorYNWVz8p74uyR1i1FnHUudK94hCgh7qKWrRW6hnFaVAFkUQp9AX6jVD5BkuNNFvv'

    let { depth, hash, height, timestamp } = await plugin.getConfirmation(txid)

    expect(depth).to.be.greaterThan(0)

    expect(hash).to.be.equal('6whs717Kr48RW3j2ocsWrW9BiGkSeLFNfnMXN23WAAHL')

    expect(height).to.be.equal(176768846)

    expect(timestamp).to.be.a('date')

  })

  it('#getTransaction should return a transaction from the network in standard format', async () => {

    let plugin = await find({ chain: 'SOL', currency: 'SOL' });
  
    let txid = 'sva4wpWvkuE2vLeGDHdDdxorYNWVz8p74uyR1i1FnHUudK94hCgh7qKWrRW6hnFaVAFkUQp9AX6jVD5BkuNNFvv'

    let transaction = await plugin.getTransaction(txid)

    expect(transaction.txid).to.be.equal(txid)

  })

  it('#getPayments should accept a txid and return a parsed SOL payment', async () => {

    let plugin = await find({ chain: 'SOL', currency: 'SOL' });

    let txid = '4No4pAMHJECHpCqhjUbxsNniaaVmE9mqPek7APhjDWM1XMSozUcsrzm5UTwPBR3XhJX87NQsfr8awZK2SGfq5X6F'

    let payments = await plugin.getPayments(txid)

    expect(payments.length).to.be.equal(1)

    let payment = payments[0]

    expect(payment.address).to.be.equal('8tWSZr2qCUNDtkHbHg1wDiYSAHJSY5pP7f6Vnav7cQDP') 

    expect(payment.amount).to.be.equal(0.000995)

    expect(payment.chain).to.be.equal('SOL') 

    expect(payment.currency).to.be.equal('SOL') 

    expect(payment.txid).to.be.equal(txid)

  })

  it.skip('#parsePayments should accept a raw transaction and return a parsed SOL payment', async () => {

    let plugin = await find({ chain: 'SOL', currency: 'SOL' });

    let txid = '4No4pAMHJECHpCqhjUbxsNniaaVmE9mqPek7APhjDWM1XMSozUcsrzm5UTwPBR3XhJX87NQsfr8awZK2SGfq5X6F'

    let txhex = ''

    let payments: Payment[] = await plugin.parsePayments(txhex)

    expect(payments.length).to.be.equal(1)

    let payment = payments[0]

    expect(payment.address).to.be.equal('') 

    expect(payment.amount).to.be.equal(0.000995)

    expect(payment.chain).to.be.equal('SOL') 

    expect(payment.currency).to.be.equal('SOL') 

    expect(payment.txid).to.be.equal(txid)

  })

})

