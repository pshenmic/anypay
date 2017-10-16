const BitcoinInvoice = require("../../../lib/bitcoin/invoice");

module.exports.create = function(request, reply) {
  let dollarAmount = request.payload.amount;
  let accountId = request.auth.credentials.accessToken.account_id;

  BitcoinInvoice.generate(dollarAmount, accountId).then(invoice => {
    reply(invoice);
  })
  .catch(error => {
    reply({ error: error.message }).code(500);
  });
}
