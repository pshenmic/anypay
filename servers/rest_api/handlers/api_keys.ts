
import * as Boom from 'boom';

import { apikeys } from '../../../lib'

export async function index(req, h) {

  let merchant_api_key = await apikeys.getMerchantApiKey(req.account.id)

  return {
    merchant_api_key
  }

}
