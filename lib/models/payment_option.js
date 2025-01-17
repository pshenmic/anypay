'use strict';
module.exports = (sequelize, DataTypes) => {
  var PaymentOption = sequelize.define('PaymentOption', {
    invoice_uid: {
      type: DataTypes.STRING,
      allowNull: false
    },
    currency_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    currency_logo_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false
    },
    chain: {
      type: DataTypes.STRING,
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    amount: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      get() {
        return parseInt(this.getDataValue('amount'))
      }
    },
    fee: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    outputs: {
      type: DataTypes.JSON,
      allowNull: false
    },
    uri: {
      type: DataTypes.STRING,
      allowNull: false
    }

  }, {
    tableName: 'payment_options',
    classMethods: {
      associate: function(models) {

        models.Invoice.hasMany(models.PaymentOption);
        models.PaymentOption.belongsTo(models.Invoice);

        // associations can be defined here
      }
    }
  });
  return PaymentOption;
};
