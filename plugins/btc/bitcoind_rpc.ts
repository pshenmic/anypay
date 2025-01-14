
import axios from 'axios'

import { config, log } from '../../lib';

export interface BroadcastTxResult {
    success: boolean;
    txid: string;
    txhex: string;
    result: any;
}

export async function broadcastTx(txhex: string): Promise<BroadcastTxResult> {

    log.info('btc.bitcoind.broadcastTx', { txhex })

    const response = await axios.post(config.get('bitcoind_rpc_host'), {
        method: 'send_raw_transaction',
        params: [txhex]
    }, {
        auth: {
            username: config.get('bitcoind_rpc_username'),
            password: config.get('bitcoind_rpc_password')
        }
    })

    if (response.status !== 200) {

        log.error('btc.bitcoind.broadcastTx.error', new Error(response.data))

        throw new Error(response.data)
    }

    log.info('btc.bitcoind.broadcastTx.result', response.data)

    return {
        success: true,
        txid: response.data.txid,
        result: response.data,
        txhex
    }

}
