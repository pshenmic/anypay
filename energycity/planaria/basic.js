
const { planaria } = require("neonplanaria")
const MongoClient = require('mongodb')
const path = require('path');
const { Actor } = require('rabbi');
var db;
var kv;
const connect = function(cb) {
  MongoClient.connect("mongodb://localhost:27017", {useNewUrlParser: true}, function(err, client) {
    if (err) {
      console.log("retrying...")
      setTimeout(function() {
        connect(cb);
      }, 1000)
    } else {
      db = client.db("planaria");
      cb();
    }
  })
}
try {
planaria.start({
  filter: {
    "from": 566470,
    "q": {
      "find": { "out.s1": "1LtyME6b5AnMopQrBPLk4FGN8UBuhxKqrn" },
      "project": { "out.s2": 1, "out.s3": 1 }
    }
  },
  onmempool: async function(e) {
    await db.collection("u").insertMany([e.tx])
  },
  onblock: async function(e) {
    await db.collection("c").insertMany(e.tx)
  },
  onstart: function(e) {
    return new Promise(async function(resolve, reject) {
      if (!e.tape.self.start) {
        await planaria.exec("docker", ["pull", "mongo:4.0.4"])
        await planaria.exec("docker", ["run", "-d", "-p", "27017-27019:27017-27019", "-v", process.cwd() + "/db:/data/db", "mongo:4.0.4"])
      }
      connect(function() {
        if (e.tape.self.start) {
          db.collection("c").deleteMany({
            "blk.i": { "$gt": e.tape.self.end }
          }).then(resolve)
        } else {
          resolve();
        }
      })
    })
  },
})
} catch(error) {
  console.log(error.message);
}
