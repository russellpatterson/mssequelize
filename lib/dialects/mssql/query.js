var Utils         = require("../../utils")
  , AbstractQuery = require('../abstract/query')
  , Request = require('tedious').Request

module.exports = (function() {
  var Query = function(client, sequelize, callee, options) {
    this.client    = client
    this.callee    = callee
    this.sequelize = sequelize
    this.options   = Utils._.extend({
      logging: console.log,
      plain: false,
      raw: false
    }, options || {})
    this.rows = []

    this.checkLoggingOption()
  }

  Utils.inherit(Query, AbstractQuery)
  Query.prototype.run = function(sql) {
    var self = this
    this.sql = sql

    if (this.options.logging !== false) {
      this.options.logging('Executing: ' + this.sql)
    }

    var request = new Request(this.sql, function(err, rowCount){
      if(err){
        self.emit('error', err, self.callee)
      }
      else{
        self.emit('success', self.formatResults(self.rows))
      }
    })

    request.on('row', function(columns){
      var row = {}
      Utils._.forEach(columns, function(col){
        row[col.metadata.colName] = col.value
      })
      self.rows.push(row)
    })

    this.client.execSql(request);
    return this
  }

  return Query
})()


