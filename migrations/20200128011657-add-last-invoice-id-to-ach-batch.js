'use strict';

module.exports = {

  up: (queryInterface, Sequelize) => {

    return queryInterface.addColumn('ach_batches', 'last_invoice_uid', {
      type: Sequelize.STRING
    });

  },

  down: (queryInterface, Sequelize) => {

    return queryInterface.removeColumn('ach_batches', 'last_invoice_uid', {
      type: Sequelize.STRING
    });

  }

};
