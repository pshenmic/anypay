
import { log, models, slack } from '../../../lib'

export async function show(req, h) {

  let accessToken = await models.AccessToken.findOne({ where: { uid: req.params.token }})

  let account = await models.Account.findOne({ where: { id: accessToken.account_id }})

  log.info(`linktracker.payscreen.help`, {
    account: account.toJSON(),
    access_token_id: accessToken
  })

  slack.notify(`${account.email} is having trouble paying!`)

  slack.notify(`linktracker.payscreen.help ${JSON.stringify({
    access_token_id: accessToken.id,
    email: account.email
  })}`, 'events')

  return h.redirect(`https://anypayinc.com/pay`)

}
