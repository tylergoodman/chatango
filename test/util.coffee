_ = require 'lodash'

module.exports =
  hexColor: ->
    _.chain(_.times(6, _.partial(_.random, 65, 70, false)))
      .map (n) ->
        String.fromCharCode n
      .join ''
      .value()
