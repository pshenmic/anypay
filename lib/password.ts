const bcrypt = require('bcrypt');

import { models } from './models';

const uuid = require('uuid');
const aws = require('aws-sdk');
const log = require('winston');

export function hash(password) {
  return new Promise((resolve, reject) => {

    bcrypt.hash(password, 10, (error, hash) => {
      if (error) { return reject(error) }
      resolve(hash);
    })
  });
}

export async function bcryptCompare(password, hash) {
  return new Promise((resolve, reject) => {
    bcrypt.compare(password, hash, (error, res) => {
      if (res) {
        resolve();
      } else {
        reject(new Error("invalid password"));
      }
    })
  })
}

export async function resetPasswordByEmail(email, newPassword) {

  let account = await models.Account.findOne({
    where: { email: email }
  })

  if (account) {

    let result = await resetPassword(account.id, newPassword);

    return result;
    
  } else {
    throw new Error(`account not found with email: ${email}`);
  }
}

async function resetPassword(accountId, newPassword) {

  let passwordHash = await hash(newPassword);

  await models.Account.update({
    password_hash: passwordHash
  }, {
    where: {
      id: accountId
    }
  })

  return true;
}

function sendPasswordResetEmail(email) {
  return new Promise(async (resolve, reject) => {

    let passwordReset = await createPasswordReset(email);

    var ses = new aws.SES({ region: 'us-east-1' });

    ses.sendEmail({
      Destination: {
        BccAddresses: ['me@stevenzeiler.com'],
        ToAddresses: [email]
      },
      Message: {
        Body: {
          Text: {
            Charset: "UTF-8",
            Data: `We got a request to reset your Anypay password.\n\nYou can reset your password by clicking the link below:\n\nhttps://admin.anypay.global/#/password-reset/${passwordReset.uid}.\n\nIf you ignore this message, your password will not be reset.`
          }
        },
        Subject: {
          Charset: "UTF-8", 
          Data: "Forgotted Password Reset"
        }
      },
      Source: 'password-reset@anypayapp.com'
    }, (error, response) => {
      if (error) {
        log.error('error sending password reset email', error.message);
        return reject(error)
      }
      log.info(`successfully set password reset email to ${email}`);
      resolve(response)
    })
  })
}

function createPasswordReset(email) {

  return models.PasswordReset.create({ email })
}

module.exports.resetPasswordById = resetPassword;
module.exports.resetPasswordByEmail = resetPasswordByEmail;
module.exports.sendPasswordResetEmail = sendPasswordResetEmail;
module.exports.createPasswordReset = createPasswordReset;
module.exports.hash = hash;

