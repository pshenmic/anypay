const Joi = require('joi');

import { database, models } from '../../../lib';
var InvoiceResponse = require('../../../lib/models/invoice').Response;

export async function index (request, reply) {
  let accountId = 14;
  let currentDate = new Date();
  let currentYear = currentDate.getFullYear();
  let currentMonth = currentDate.getMonth() + 1;
  let currentDay = currentDate.getDate() + 1;
  let targetDate = currentYear + '-' + currentMonth + '-' + currentDay + 'T00:00:00.0Z';
  database.query(`select*
                        from invoices
                        where "createdAt">'` + targetDate + `'
                        `, {
      type: database.QueryTypes.SELECT
    })
    .then(invoices => {
      reply({
        invoices: invoices,
        targetDate: targetDate
      });
    })
    .catch(error => {
      reply({
        error: error.message
      }).code(500);
    });
}
