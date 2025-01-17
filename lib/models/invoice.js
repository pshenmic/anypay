

import { config } from '../config'

import * as Joi from 'joi';

import * as moment from 'moment';

import { config } from '../config'

const DEFAULT_WEBHOOK_URL = `${config.get('API_BASE')}/v1/api/test/webhooks`

const shortid = require("shortid");

module.exports = function(sequelize, Sequelize) {

  const Account = require("./account")(sequelize, Sequelize);

  const Invoice = sequelize.define(
    "invoice",
    {
      uid: Sequelize.STRING,
      currency: Sequelize.STRING,
      email: Sequelize.STRING,
      memo: {
        type: Sequelize.STRING,
        defaultValue: ''
      },
      amount: {
        type: Sequelize.DECIMAL,
        get() {
          return parseFloat(this.getDataValue("amount"));
        }
      },
      external_id: {
        type: Sequelize.STRING
      },
      business_id: {
        type: Sequelize.STRING
      },
      location_id: {
        type: Sequelize.STRING
      },
      register_id: {
        type: Sequelize.STRING
      },
      cancelled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      app_id: {
        type: Sequelize.INTEGER
      },
      secret: {
        type: Sequelize.STRING
      },
      item_uid: {
        type: Sequelize.STRING
      },
      metadata: {
        type: Sequelize.JSON
      },
      headers: {
        type: Sequelize.JSON
      },
      tags: {
        type: Sequelize.ARRAY(Sequelize.STRING)
      },
      is_public_request: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      currency_specified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      replace_by_fee: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      fee_rate_level: {
        type: Sequelize.STRING,
        defaultValue: 'fastestFee'
      },
      expiry: {
        type: Sequelize.DATE
      },
      complete: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      completed_at: {
        type: Sequelize.DATE
      },
      redirect_url: {
        type: Sequelize.STRING
      },
      webhook_url: {
        type: Sequelize.STRING,
        defaultValue: DEFAULT_WEBHOOK_URL
      },
      invoice_amount: {
        type: Sequelize.DECIMAL,
        allowNull: true,
        get() {
          let value = this.getDataValue("invoice_amount")
          if (value) { return parseFloat(value) }
        }
      },
      invoice_amount_paid: {
        type: Sequelize.DECIMAL,
        allowNull: true,
        get() {
          let value = this.getDataValue("invoice_amount_paid")
          if (value) { return parseFloat(value) }
        }
      },
      invoice_currency: {
        type: Sequelize.STRING,
        allowNull: true
      },
      denomination_amount: {
        type: Sequelize.DECIMAL,
        allowNull: true,
        get() {
          let value = this.getDataValue("denomination_amount")
          if (value) { return parseFloat(value) }
        }
      },
      denomination_amount_paid: {
        type: Sequelize.DECIMAL,
        allowNull: true,
        get() {
          let value = this.getDataValue("denomination_amount_paid")
          if (value) { return parseFloat(value) }
        }
      },
      denomination_currency: {
        type: Sequelize.STRING,
        allowNull: true
      },

      denomination: {
        type: Sequelize.VIRTUAL,
        get() {
          return this.getDataValue("denomination_currency")
        }
      },
      address: {
        type: Sequelize.STRING,
        allowNull: true
      },
      account_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      energycity_account_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      access_token: Sequelize.STRING,
      wordpress_site_url: Sequelize.STRING,
      hash: Sequelize.STRING,
      status: {
        type: Sequelize.STRING,
        defaultValue: 'unpaid'
      },
      complete: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      locked: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      uri: {
        type: Sequelize.STRING
      },
      completed_at: {
        type: Sequelize.DATE
      },
      settledAt: Sequelize.DATE,
      paidAt: Sequelize.DATE
    },
    {
      hooks: {
        beforeCreate: (invoice, options) => {

          if (!invoice.uid) {
            invoice.uid = shortid.generate();
          }
          invoice.uri = `pay:?r=${config.get('API_BASE')}/r/${invoice.uid}`

          invoice.expiry = moment().add(15, 'minutes').toDate();
        }
      }
    }
  );

  return Invoice;
}

