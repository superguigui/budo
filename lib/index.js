var bole = require('bole')
var log = bole('budo')
var xtend = require('xtend')
var budo = require('./budo')
var url = require('url')
var getport = require('getport')

module.exports = function createBudo(entry, opts, cli) {
  var argv = xtend(opts)
  
  if (argv.stream) {
    bole.output({
      stream: argv.stream,
      level: 'debug'
    })
  }
  
  var emitter = budo()

  if (argv.o || argv.outfile) {
    console.error('Warning: --outfile has been removed in budo@3.0')
    //ensure we don't pass to watchify
    delete argv.o
    delete argv.outfile
  }

  var entries = Array.isArray(entry) ? entry : [entry]
  entries = entries.filter(Boolean)
  if (entries.length === 0) {
    return bail("No entry scripts specified!")
  }

  //clean up entries and take the first one for bundle mapping
  var file
  entries = entries.map(function(entry, i) {
    var map = mapping(entry)
    if (i === 0)
      file = map.to
    return map.from
  })

  //if user specified --serve use that as our entry map
  var serveAs = argv.serve
  if (serveAs && typeof serveAs === 'string')
    file = serveAs

  var basePort = argv.port || 9966
  argv.dir = argv.dir || process.cwd()
  argv.serve = url.parse(file).path
  
  if (typeof argv.dir !== 'string') 
    return bail('--dir must be a path')

  //run watchify server
  emitter.on('connect', setupLive)

  getport(basePort, function(err, port) {
    if (err) {
      console.error("Could not find available port", err)
      process.exit(1)
    }
    argv.port = port
    emitter._start(entries, argv, cli)
      .on('exit', function() {
        log.info('closing')
      })
  })
  
  return emitter

  //if user requested live: true, set it up with some defaults
  function setupLive() {
    if (argv.live || argv.livePlugin || argv['live-plugin']) {
      emitter
        .watch()
        .live()
        .on('watch', function(ev, file) { 
          //HTML/CSS changes
          if (ev === 'change' || ev === 'add')
            emitter.reload(file)
        })
        .on('pending', function(file) {
          emitter.reload(file)
        })
    }
  }

  function mapping(entry) {
    var parts = entry.split(':')
    if (parts.length > 1 && parts[1].length > 0) {
      return { from: parts[0], to: parts[1] }
    }
    return { from: entry, to: entry }
  }

  function bail(msg) {
    process.nextTick(function() {
      emitter.emit('error', new Error(msg))
    })
    return emitter
  }
}