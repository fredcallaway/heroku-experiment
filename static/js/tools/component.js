
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

  // record an event tagged with component's event prefix and uniqueID
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
  // records a promise that should be rejected when the component stops running
  registerPromise(promise) {
    this.checkStatus()
    if (typeof promise.reject != "function") {
      promise = deferredPromise(promise)
    }
    this.promises.push(promise)
    return promise
  }
  // rejects all promises that were registered with registerPromise
  rejectPromises() {
    for (const promise of this.promises) {
      promise.reject()
    }
    this.promises = []
  }
  // registers a promise that resolves when an event occurs
  eventPromise(...args) {
    return this.registerPromise(EVENTS.promise(...args))
  }
  // adds a promise that resolves in ms milliseconds
  sleep(ms, name = "sleep") {
    return this.registerPromise(sleep(ms, name))
  }
  // registers a callback that will be called whenever an event occurs
  onEvent(event, callback) {
    this.checkStatus()
    this.eventCallbacks.push([event, callback])
    EVENTS.on(event, callback)
  }
  // unregisters all callbacks that were registered with onEvent
  cancelEventCallbacks() {
    for (const [event, callback] of this.eventCallbacks) {
      EVENTS.off(event, callback)
    }
    this.eventCallbacks = []
  }

  // appends the component's div to the given div
  appendTo(div) {
    this.div.appendTo(div)
    return this
  }
  // appends the component's div to the given div, emptying it first
  attach(div) {
    div.empty()
    this.div.appendTo(div)
    return this
  }

  // throws an error if the component is done or cancelled
  // this effectively cuts short this.run
  checkStatus() {
    // these should be canceled already but double check
    if (this.status != "running" && this.status != "ready") {
      this.rejectPromises()
      this.cancelEventCallbacks()
      throw new Error("Component is not running")
    }
  }

  // runs the component and returns a promise that resolves when it is done
  run(div, ...args) {
    this.status = "running"
    if (div) this.attach(div)
    this.recordEvent("run")
    let run = this._run(...args)
    if (typeof run?.then != "function") {
      throw new Error("Component.run must return a promise (use async)")
    }
    this.result = deferredPromise(run)

    this.result
    .then((result) => {
        this.recordEvent("done", result)
        this.status = "done"
      })
      .catch((err) => {
        this.cancel()
        this.recordEvent("error", err)
        this.status = "error"
      })
    return this.result
  }

  // cancels the run and rejects all promises
  cancel() {
    this.rejectPromises()
    this.cancelEventCallbacks()
    this.status = "cancelled"
    this.result.reject()
  }
}
