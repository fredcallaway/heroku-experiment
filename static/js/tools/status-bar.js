class StatusBar {
  constructor(options = {}) {
    _.defaults(options, {
      nTrial: undefined,
      width: 1100,
      height: 100,
      help: "",
      showPoints: false,
    })
    Object.assign(this, options)

    this.div = $("<div>").css({
      height: this.height,
      width: this.width,
      margin: "auto",
      position: "relative",
      "user-select": "none",
      // 'margin-bottom': '20px',
      // 'margin-top': '20px'
    })

    if (this.nTrial) {
      this.counter = $("<div>")
        .addClass("left")
        .css({
          "margin-top": "20px",
          "font-weight": "bold",
          "font-size": "16pt",
        })
        .appendTo(this.div)
      this.count = 1
      this.setCounter(this.count)
    }

    if (this.showPoints) {
      this.pointsText = $("<div>")
        .css({
          "font-weight": "bold",
          "font-size": "16pt",
        })
        .appendTo(this.div)
        .text(`Points: 0`)
      EVENTS.on("bonus.addPoints", (event, data) => {
        this.pointsText.text(`Points: ${data.total}`)
      })
    }

    if (this.help) {
      this.helpButton = $("<button>")
        .appendTo(this.div)
        .addClass("btn-help")
        .text("?")
        .click(async () => {
          DATA.recordEvent("experiment.help")
          await Swal.fire({
            title: "Instructions",
            html: this.help,
            icon: "info",
            confirmButtonText: "Got it!",
          })
        })
    }
  }

  prependTo(display) {
    this.div.prependTo(display)
    return this
  }

  setCounter(count) {
    this.count = count
    this.counter.text(`Round ${this.count} / ${this.nTrial}`)
  }

  incrementCounter() {
    this.setCounter(this.count + 1)
  }
}
