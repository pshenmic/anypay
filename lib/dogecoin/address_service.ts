import * as Blockcypher from './blockcypher';
import * as models from '../models';
import * as log from 'winston';

export async function getNewAddress(accountId: number): Promise<string> {

  const account = await models.Account.findOne({ where: { id: accountId }});

  const address = account.dogecoin_address;

  const paymentEndpoint = await Blockcypher.createPaymentEndpoint(address)

  console.log('dogecoin address generated', paymentEndpoint);

  return paymentEndpoint.input_address;
}
