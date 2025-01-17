

import { find } from '../../lib/plugins'

import { Payment } from '../../lib/plugin'

import { expect } from 'chai'

describe('USDC on ETH', () => {

  it('should find the plugin for ETH', async () => {

    let plugin = await find({ chain: 'ETH', currency: 'USDC' })

    expect(plugin.currency).to.be.equal('USDC')

    expect(plugin.chain).to.be.equal('ETH')

    expect(plugin.decimals).to.be.equal(6)

  })

  it('#getConfirmation should return block data for confirmed transaction', async () => {

    let plugin = await find({ chain: 'ETH', currency: 'USDC' });

    let txid = '0xcd43123eea81e3b9e2227d6468f6f6ad174e90e6f793b2302c7b03f04604381b'

    let { depth, hash, height, timestamp } = await plugin.getConfirmation(txid)

    expect(depth).to.be.greaterThan(0)

    expect(hash).to.be.equal('0x5b192061e9a046cb05f7f72f5d71bcca2d53cc7083d3a738163f7e155ec6fa05')

    expect(height).to.be.equal(17255716)

    expect(timestamp).to.be.a('date')

  })

  it('#getPayments should accept a txid and return a parsed USDC payment', async () => {

    let plugin = await find({ chain: 'ETH', currency: 'USDC' });

    let txid = '0xa0c9b40b8288159fee100742f796a36bea9468c475454159c82081b9bcffd737'

    let payments: Payment[] = await plugin.getPayments(txid)

    expect(payments.length).to.be.equal(1)

    let payment = payments[0]

    expect(payment.address).to.be.equal('0x63fc765a644d31f87a2284fd4bf728c9d767d921') 

    expect(payment.amount).to.be.equal(5.09827)

    expect(payment.chain).to.be.equal('ETH') 

    expect(payment.currency).to.be.equal('USDC') 

    expect(payment.txid).to.be.equal(txid)

  })

  it('#parsePayments should accept a raw transaction and return a parsed USDC payment', async () => {

    let plugin = await find({ chain: 'ETH', currency: 'USDC' });

    let txid = '0xa0c9b40b8288159fee100742f796a36bea9468c475454159c82081b9bcffd737'

    let txhex = '0xf8ad8308f1b7850af16b16008302bf2094a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4880b844a9059cbb00000000000000000000000063fc765a644d31f87a2284fd4bf728c9d767d92100000000000000000000000000000000000000000000000000000000004dcb1e25a09bfc24a2e5068063333d1846203b17567e7651c8d1a3694c9d9e34b4675c2c52a07812262351929c7d17d6ae3304f74041263316f1cd271e1c91c21bdeddb3e23e'

    let payments: Payment[] = await plugin.parsePayments(txhex)

    expect(payments.length).to.be.equal(1)

    let payment = payments[0]

    expect(payment.address).to.be.equal('0x63fc765a644d31f87a2284fd4bf728c9d767d921') 

    expect(payment.amount).to.be.equal(5.09827)

    expect(payment.chain).to.be.equal('ETH') 

    expect(payment.currency).to.be.equal('USDC') 

    expect(payment.txid).to.be.equal(txid)

  })

})

