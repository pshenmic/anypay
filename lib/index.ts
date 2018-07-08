import {ConfigureOracles} from './oracles'
var Account = require('./models/account');

import {configureOracles} from '../config/oracles';

import * as accounts from './accounts';
import * as settings from './settings';
import * as prices from './prices';
import * as models from './models';

var oracles = ConfigureOracles(configureOracles);

export {
  oracles,
  models,
  accounts,
  settings,
  prices
}

