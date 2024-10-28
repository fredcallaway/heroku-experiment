class ExampleTask extends Component {
  constructor(options = {}) {
    options = {
      eventPrefix: "task",
      targetSize: 20,
      timeout: 3000,
      nRound: 5,
      delayRange: [500, 1000],
      screenWidth: 600,
      screenHeight: 400,
      ...options,
    }
    super(options) // note that options are automatically assigned to instance variables
    window.task = this  // allows you to reference the task object from the console
    this.recordEvent("initialize", options)

    // setup the display
    // this.div is defined in Component's constructor
    this.div.css({
      margin: "auto",
      position: "relative",
      textAlign: "center",
    })

    this.canvas = new Canvas({
      width: this.screenWidth,
      height: this.screenHeight,
    }).appendTo(this.div)

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

  async _run() {
    // this is our main method, which is called by this.run()
    await button(this.centerText, "start").promise()
    await this.countdown()
    for (let i = 0; i < this.nRound; i++) {
      // using this.sleep will reject the promise if the run is canceled (this.cancel())
      // this ensures that the task doesn't continue running after cancel() is called
      // if you don't use cancel(), you don't need to worry about this
      await this.sleep(uniformRandom(this.delayRange[0], this.delayRange[1]))
      this.setTarget()

      let result = await this.getClick()
      if (result != "hit") {
        await this.sleep(1000)
        await this.showOutcome(result)
        return result
      }
    }
    await this.showOutcome("win")
    return "win"
  }

  async getClick() {
    let result = await Promise.race([
      this.canvas.getClick(),
      this.sleep(this.timeout, "timeout"),
    ])
    if (result != "timeout") {
      let { x, y } = result
      if (this.isHit(x, y)) {
        this.recordEvent("hit")
        this.drawTarget("green")
        await this.sleep(300)
        this.canvas.clear()
        return "hit"
      } else {
        this.recordEvent("miss")
        this.canvas.drawCross(x, y, 5, "red")
        return "miss"
      }
    } else {
      // timeout
      this.recordEvent("timeout")
      this.drawTarget("red")
      return "timeout"
    }
  }

  async countdown() {
    this.recordEvent("countdown")
    for (let i = 3; i > 0; i--) {
      this.centerText.text(i)
      await sleep(1000)
    }
    this.centerText.hide()
  }

  async showOutcome(outcome) {
    this.canvas.clear()
    this.recordEvent("outcome", {outcome})
    // it's good to check this.status before showing alerts specifically
    // because they will show up even if the component's div has been removed
    if (outcome == "win") {
      await alert_success()
    } else {
      await alert_failure()
    }
  }

  setTarget() {
    this.targetX = uniformRandom(this.targetSize, this.screenWidth - this.targetSize)
    this.targetY = uniformRandom(this.targetSize, this.screenHeight - this.targetSize)
    this.recordEvent("setTarget", { x: this.targetX, y: this.targetY })
    this.drawTarget()
  }

  drawTarget(color="black") {
    this.canvas.clear().drawCircle(
      this.targetX,
      this.targetY,
      this.targetSize,
      color
    )
  }

  isHit(x, y) {
    const distance = Math.sqrt(Math.pow(x - this.targetX, 2) + Math.pow(y - this.targetY, 2))
    return distance <= this.targetSize
  }
}
