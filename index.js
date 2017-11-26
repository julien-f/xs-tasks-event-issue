#!/usr/bin/env node

process.env.DEBUG = '*'

const defer = require('golike-defer').default
const { createClient } = require('xen-api')

const required = name => {
  throw new Error(`missing param <${name}>`)
}

defer(async ($defer, [
  url = required('url'),
]) => {
  const xapi = createClient({
    allowUnauthorized: true,
    url,
    watchEvents: false,
  })

  await xapi.connect()
  $defer.call(xapi, 'disconnect')

  ;(async () => {
    let token = ''
    let events
    while (true) {
      ({ token, events } = await xapi.call('event.from', [ 'task' ], token, 60+0.1))
      for (const event of events) {
        console.log(event.operation, event.ref, event.snapshot)
      }
    }
  })()

  const taskRef = await xapi.call('task.create', 'test task', '')
  xapi.call('task.destroy', taskRef)
  await new Promise(resolve => setTimeout(resolve, 5e3))

  const [ poolRef ] = await xapi.call('pool.get_all')
  const pool = await xapi.call('pool.get_record', poolRef)

  await xapi.call('host.restart_agent', pool.master)
  await new Promise(resolve => setTimeout(resolve, 5e3))
})(process.argv.slice(2)).catch(
  console.error.bind(console, 'error')
)
