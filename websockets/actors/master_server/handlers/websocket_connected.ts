
import { log } from 'rabbi';

import { websocket_servers } from '../../../lib/websocket_servers';

module.exports = async function(channel, msg, json) {

  log.info(JSON.stringify(json)); 

  await websocket_servers.addWebsocket(json);

  await channel.ack(msg);

}
