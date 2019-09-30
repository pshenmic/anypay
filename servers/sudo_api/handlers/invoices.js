
import { models } from '../../../lib';

const log = require('winston');

module.exports.sudoIndex = async (request, reply) => {

  log.info(`controller:invoices,action:index`, request.query);

  let where = {}

  if (request.query.currency) {
    where['currency'] = request.query.currency;
  }

  if (request.query.denomination) {
    where['denomination'] = request.query.denomination;
  }

  if (request.query.account_id) {
    where['account_id'] = request.query.account_id;
  }

  if (request.query.status) {
    where['status'] = request.query.status;
  }

  var invoices = await models.Invoice.findAll({

    where,

    order: [
      request.query.order || ['createdAt', 'DESC']
    ],

    offset: parseInt(request.query.offset) || 0,

    limit: parseInt(request.query.limit) || 100

  });

  return { invoices };

};

module.exports.sudoShow = async function(request, reply) {

  let invoiceId = request.params.invoice_id;

  log.info(`controller:invoices,action:show,invoice_id:${invoiceId}`);

  try {

	  let invoice = await models.Invoice.findOne({
	    where: {
	      uid: invoiceId
	    }
	  });

	  if (invoice) {

      let data = invoice.toJSON();

      data.account = await models.Account.findOne({
        where: { id: invoice.account_id }
      });

      data.cashback = await models.CashbackCustomerPayment.findOne({
        where: { invoice_id: invoice.id }
      });

      return data;

	  } else {

	    log.error('no invoice found', invoiceId);

	    throw new Error('invoice not found')
	  }
  } catch(error) {
	  log.error(error.message);
  }


}