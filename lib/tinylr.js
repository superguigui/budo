//a thin wrapper around tiny-lr module
var log = require('bole')('budo')
var xtend = require('xtend')
var tinylr = require('tiny-lr')
var getport = require('getport')

module.exports = function(opt) {
  opt = xtend(opt)
  opt.host = opt.host || 'localhost'
  
  var server = tinylr()
  var closed = false, ready = false
  var basePort = opt.port || 35729

  getport(basePort, function(err, port) {
    if (err) {
      console.error("Could not find available port", err)
      process.exit(1)
    }
    opt.port = port

    server.listen(opt.port, opt.host, function() {
      ready = true
      if (closed) 
        return server.close()

      log.info('livereload running on ' + opt.port)
    })
  })

  var serverImpl = server.server
  serverImpl.removeAllListeners('error')
  serverImpl.on('error', function(err) {
    if (err.code === 'EADDRINUSE') {
      process.stderr.write('ERROR: livereload not started, port ' + opt.port + ' is in use\n')
      close()
    }
  })

  function close() {
    if (closed)
      return
    closed = true
    if (ready)
      server.close()
  }

  return {
    close: close,

    reload: function reload(path) {
      try {
        server.changed({
          body: {
            files: path ? [ path ] : '*'
          }
        })
      } catch (e) {
        throw e
      }
    }
  }
}