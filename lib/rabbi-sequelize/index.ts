
import { awaitChannel } from '../amqp';
//import { log } from '../log';

// https://sequelize.readthedocs.io/en/2.0/docs/hooks/

const hookNames = [

/*
  'beforeBulkCreate',
  'beforeBulkDestroy',
  'beforeBulkUpdate',

  'beforeValidate',
  'validate',
  'afterValidate',
  'validationFailed',

  'beforeCreate',
  'beforeDestroy',
  'beforeUpdate',

  'create',
  'destroy',
  'update',

*/
  'afterCreate',
  'afterUpdate',
  'afterDestroy',
  /*


  'afterBulkCreate',
  'afterBulkDestroy',
  'afterBulkUpdate'
  */

]

export function bindAllModelsHooks(models, exchange) {

  Object.values(models).forEach(async (model: any) => {

    bindModelHooks(model, exchange);

  });

}

export function bindModelHooks(model, exchange) {

  hookNames.forEach(hookName => {

    bindHook(model, hookName, exchange);

  });

}

export function bindHook(model, hookName, exchange) {

  var name = model.options.name.singular
    .split('_')
    .map(capitalizeFirstLetter)
    .join('');

  model.addHook(hookName, async (instance) => {

    let channel = await awaitChannel();

    let event = `models.${name}.${hookName}`;

    let data = instance.toJSON()

    //log.debug(event, data);

    await channel.publish(exchange, event, Buffer.from(JSON.stringify(data)));

  });

}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

