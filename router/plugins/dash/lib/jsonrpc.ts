require("dotenv").config();

import * as http from 'superagent';

async function rpcCall(method: string, params=[]) {

  try {

    let resp = await http
      .post(`http://${process.env.DASH_RPC_HOST}:${process.env.DASH_RPC_PORT}`)
      .auth(process.env.DASH_RPC_USER, process.env.DASH_RPC_PASSWORD)
      .send({
        method,
        params
      });

    return resp.body.result;

  } catch(error) {

    console.error(error.message, error.response.body.error.message);

    throw error;

  }
}

async function rpcOne(method: string, params=[]) {

  try {

    let resp = await http
      .post('https://nodes.anypay.global/dash/rpc/one')
      .auth('anypay', process.env.SUDO_ADMIN_KEY)
      .send({
        method,
        params: JSON.stringify(params)
      });

    return resp.body.resp;

  } catch(error) {

    console.error(error.message, error.response.body.error.message);

    throw error;

  }
}

export {

  rpcCall,

  rpcOne

}