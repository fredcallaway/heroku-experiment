class ExampleTask {
  logPrefix = "task" // log events will be task.run, task.done, etc.
  constructor(options = {}) {
    // parameters become instance variables; defaults can be overridden by options
    let params = {
      trialId: randomUUID(),
      targetSize: 20,
      timeout: 3000,
      nRound: 5,
      delayRange: [500, 1000],
      screenWidth: 600,
      screenHeight: 400,
    }
    // set up parameters
    Object.assign(params, options) // merge options into params
    this.logEvent("initialize", params)
    Object.assign(this, params) // assign parameters to instance variables
    window.task = this  // allows you to reference the task object from the console
    this.done = makePromise() // create a promise that will be resolved when the trial is complete
    
    // setup the display
    this.div = $("<div>").css({
      margin: "auto",
      position: "relative",
      textAlign: "center",
    })
    this.canvas = new Canvas({
      width: this.screenWidth,
      height: this.screenHeight,
    }).attach(this.div)
    this.centerText = $("<div>")
      .css({
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        fontSize: "80px",
        fontWeight: 400,
        margin: 0,
        lineHeight: 1,
      })
      .appendTo(this.div)
  }

  async play() {
    await button(this.centerText, "start").promise()
    // await this.countdown()
    for (let i = 0; i < this.nRound; i++) {
      await sleep(uniformRandom(this.delayRange[0], this.delayRange[1]))
      this.drawTarget()
      let result = await Promise.race([
        this.canvas.getClick(),
        sleep(this.timeout, "timeout")
      ])
      if (result != "timeout") {
        let { x, y } = result
        if (this.isHit(x, y)) {
          this.logEvent("hit")
          this.canvas.clear()
        } else {
          this.logEvent("miss")
          this.canvas.drawCross(x, y, 5, "red")
          await sleep(1000)
          this.showOutcome("lose")
          return
        }
      } else {  // timeout
        this.logEvent("timeout")
        this.canvas.drawCircle(this.targetX, this.targetY, this.targetSize, "red")
        await sleep(1000)
        this.showOutcome("lose")
        return
      }
    }
    this.showOutcome("win")
  }

  async countdown() {
    this.logEvent("countdown")
    for (let i = 3; i > 0; i--) {
      this.centerText.text(i)
      await sleep(1000)
    }
    this.centerText.hide()
  }

  async showOutcome(outcome) {
    this.canvas.clear()
    this.logEvent("outcome", {outcome})
    if (outcome == "win") {
      await alert_success()
    } else {
      await alert_failure()
    }
    this.done.resolve()
    this.div.remove()
  }

  drawTarget() {
    this.targetX = uniformRandom(this.targetSize, this.screenWidth - this.targetSize)
    this.targetY = uniformRandom(this.targetSize, this.screenHeight - this.targetSize)
    this.logEvent("drawTarget", { x: this.targetX, y: this.targetY })
    this.canvas.clear().drawCircle(this.targetX, this.targetY, this.targetSize, "black")
  }

  isHit(x, y) {
    const distance = Math.sqrt(Math.pow(x - this.targetX, 2) + Math.pow(y - this.targetY, 2))
    return distance <= this.targetSize
  }

  async run(display) {
    if (display) this.attach(display)
    this.logEvent(`run`)
    this.play()
    await this.done // wait until the trial is complete
    this.logEvent(`done`) // you could also record data here
  }

  // you might not need to change anything below

  logEvent(event, info = {}) {
    info.trialID = this.trialID
    logEvent(this.logPrefix + "." + event, info)
  }

  attach(display) {
    display.empty() // clear the display
    this.div.appendTo(display) // attach the main div to the display
    return this
  }
}
