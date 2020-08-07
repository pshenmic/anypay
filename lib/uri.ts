
interface InvoiceURIParams {
  currency: string;
  uid: string;
}

const protocols = {
  'DASH': 'dash',
  'ZEC': 'zcash',
  'BTC': 'bitcoin',
  'LTC': 'litecoin',
  'ETH': 'ethereum',
  'XMR': 'monero',
  'DOGE': 'dogecoin',
  'BCH': 'bitcoincash',
  'XRP': 'ripple',
  'ZEN': 'horizen',
  'SMART': 'smartcash',
  'RVN': 'ravencoin',
  'BSV': 'pay'
};

export function computeInvoiceURI(params: InvoiceURIParams) {

  const protocol = protocols[params.currency] || 'pay';

  const uri = `${protocol}:?r=https://api.anypayinc.com/r/${params.uid}`;

  return uri;

}

