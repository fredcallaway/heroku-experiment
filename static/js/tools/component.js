
class Component {
  constructor(options = {}) {
    options = {
      autoAssignOptions: true, // all options become instance variables (e.g. this.foo = options.foo)
      eventPrefix: undefined, // this.recordEvent("foo") will record "eventPrefix.foo"
      recordEvents: true, // set to false to disable recording events
      ...options,
    }
    if (options.autoAssignOptions) {
      Object.assign(this, options)
    }
    this.div = $("<div>")
    this.result = null
    this.status = "ready"
    this.eventPrefix =
    options.eventPrefix || this.eventPrefix || this.constructor.name
    this.uniqueID =
      options.uniqueID ||
      makeUniqueID(this.eventPrefix, { alwaysPostfix: true })
    this.promises = []
    this.eventCallbacks = []
  }
  async _run() {
    // subclasses should implement this
    // it must return a promise (use async)
    // call from outside the component with this.run()
    throw new Error("Component._run must be implemented")
  }

  checkStatus() {
    // these should be canceled already but double check
    this.rejectPromises()
    this.cancelEventCallbacks()
    if (this.status != "running" && this.status != "ready") {
      throw new Error("Component is not running")
    }
  }

  recordEvent(event, info = {}) {
    this.checkStatus()
    if (!this.recordEvents) return
    if (typeof info != "object") {
      info = { info }
    }
    DATA.recordEvent(this.eventPrefix + "." + event, {
      ...info,
      uniqueID: this.uniqueID,
    })
  }
  
  registerPromise(promise) {
    this.checkStatus()
    if (typeof promise.reject != "function") {
      promise = deferredPromise(promise)
    }
    this.promises.push(promise)
    return promise
  }
 rejectPromises() {
   for (const promise of this.promises) {
     promise.reject()
    }
    this.promises = []
  }
  eventPromise(...args) {
    return this.registerPromise(EVENTS.promise(...args))
  }
  sleep(ms, name = "sleep") {
    return this.registerPromise(sleep(ms, name))
  }
  
  onEvent(event, callback) {
    this.checkStatus()
    this.eventCallbacks.push([event, callback])
    EVENTS.on(event, callback)
  }
  cancelEventCallbacks() {
    for (const [event, callback] of this.eventCallbacks) {
      EVENTS.off(event, callback)
    }
    this.eventCallbacks = []
  }

  appendTo(div) {
    this.div.appendTo(div)
    return this
  }
  attach(div) {
    div.empty()
    this.div.appendTo(div)
    return this
  }
  
  run(div, ...args) {
    this.status = "running"
    if (div) this.attach(div)
    this.recordEvent("run")
    let run = this._run(...args)
    if (typeof run?.then != "function") {
      throw new Error("Component.run must return a promise (use async)")
    }
    this.result = deferredPromise(run)

    this.result.then(result => {
      this.recordEvent("done", result)
      this.status = "done"
    })
    return this.result
  }
  cancel() {
    this.rejectPromises()
    this.cancelEventCallbacks()
    this.status = "cancelled"
    this.result.reject()
  }
}
