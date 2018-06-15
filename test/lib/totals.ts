import * as assert from 'assert';
import * as Database from "../../lib/database";
import {monthly} from '../../lib/totals';

describe("Monthly Totals By Account", () => {

  var accountId = 1;

  before(async () => {
    await Database.sync();
  });

  describe("monthly totals for DASH", async () => {

    it("should return the monthly totals for the acocunt", async () => {

      let totals = await monthly.forAccount(accountId).forCurrency('DASH');

      assert(totals.length >= 0);
    });

  });

  describe("monthly totals for BCH", () => {

    it("should return the monthly totals for the acocunt", async () => {

      let totals = await monthly.forAccount(accountId).forCurrency('BCH');

      assert(totals.length >= 0);
    });

  });

  describe("monthly totals for ZEC", () => {

    it("should return the monthly totals for the acocunt", async () => {

      let totals = await monthly.forAccount(accountId).forCurrency('ZEC');

      assert(totals.length >= 0);
    });

  });

});
