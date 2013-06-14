var Utils = require('./../utils')

module.exports = (function() {
  var HasManySingleLinked = function(definition, instance) {
    this.__factory = definition
    this.instance = instance
  }

  HasManySingleLinked.prototype.injectGetter = function(options) {
    var where = {}, options = options || {},
      instancePrimaryKey = this.instance.primaryKeyCols[0]

    where[this.__factory.identifier] = this.instance[instancePrimaryKey]

    options.where = options.where ? Utils._.extend(options.where, where) : where
    return this.__factory.target.findAll(options)
  }

  HasManySingleLinked.prototype.injectSetter = function(emitter, oldAssociations, newAssociations) {
    var self    = this
      , options = this.__factory.options
      , chainer = new Utils.QueryChainer(),
      instancePrimaryKey = self.instance.primaryKeyCols[0],
      targetPrimaryKey = self.__factory.target.primaryKeyCols[0]

      , obsoleteAssociations = oldAssociations.filter(function (old) { 
          return !Utils._.find(newAssociations, function (obj) {
            return obj[targetPrimaryKey] === old[targetPrimaryKey]
          }) 
        })
      , unassociatedObjects = newAssociations.filter(function (obj) { 
          return !Utils._.find(oldAssociations, function (old) {
            return obj[targetPrimaryKey] === old[targetPrimaryKey]
          }) 
        })

    // clear the old associations
    obsoleteAssociations.forEach(function(associatedObject) {
      associatedObject[self.__factory.identifier] = null
      chainer.add(associatedObject.save())
    })

    // set the new associations
    unassociatedObjects.forEach(function(associatedObject) {
      associatedObject[self.__factory.identifier] = self.instance[instancePrimaryKey]
      chainer.add(associatedObject.save())
    })

    chainer
      .run()
      .success(function() { emitter.emit('success', newAssociations) })
      .error(function(err) { emitter.emit('error', err) })
  }

  HasManySingleLinked.prototype.injectAdder = function(emitterProxy, newAssociation) {
    var instancePrimaryKey = this.instance.primaryKeyCols[0]

    newAssociation[this.__factory.identifier] = this.instance[instancePrimaryKey]

    newAssociation.save()
      .success(function() { emitterProxy.emit('success', newAssociation) })
      .error(function(err) { emitterProxy.emit('error', err) })
      .on('sql', function(sql) { emitterProxy.emit('sql', sql) })
  }

  return HasManySingleLinked
})()
