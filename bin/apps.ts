#!/usr/bin/env ts-node

require("dotenv").config()

import * as program from 'commander'

import { createApp, createAppToken } from '../lib/apps';
import { models } from '../lib';

program
  .command('create <account_id> <name>')
  .action(async (account_id, name) => {

    let [app] = await createApp({ account_id, name })

    console.log(app.toJSON())

    process.exit(0);

  })

program
  .command('token <app_id>')
  .action(async (app_id) => {

    let token = await createAppToken(app_id)

    console.log(token.toJSON())

    process.exit(0);

  })

program.parse(process.argv)
