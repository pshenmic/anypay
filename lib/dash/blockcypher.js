const http = require('superagent');

let token = process.env.BLOCKCYPHER_TOKEN;

function createPaymentEndpoint(merchantAddress) {

	return new Promise((resolve, reject) => {
		let webhook = {
			destination: merchantAddress,
			callback_url: "https://blockcypher.anypay.global/dash/webhooks"
		};

		http
			.post(`https://api.blockcypher.com/v1/dash/main/payments?token=${token}`)
			.send(webhook)
			.end((error, response) => {
				if (error) { return reject(error) };
				resolve(response.body);
			});
  });
};

module.exports.createPaymentEndpoint = createPaymentEndpoint;
