const Invoice = require('../models/invoice');
const Features = require('../features');
const http = require('superagent');
const log = require('winston');

const BitcoinCashPrice = require('./price');

const FORWADING_SERVICE_URL = process.env.FORWARDING_SERVICE_URL || 'http://127.0.0.1:8000';

interface Binding {
  input: string;
  destination: string;
}

export function getNewAddress(merchantAddress: string): Promise<Binding> {

  return new Promise((resolve, reject) => {
    if (!merchantAddress) {
      reject(new Error('merchant address not provided'));
    }

    http
      .post(`${FORWADING_SERVICE_URL}/payments`)
      .send({
        destination:  merchantAddress
      })
      .timeout({
        response: 5000,
        deadline: 10000
      })
      .end((error, response) => {
        if (error) {
          log.error('error creating bitcoincash forwarding address', error.message);
          return reject(error);
        } else {
          if (response.body.input) {
            return resolve({
              input: response.body.input,
              destination: merchantAddress
            });
          } else {
            reject(new Error("invalid payment forwarding service response"));
          }
        }
      });
  });
}