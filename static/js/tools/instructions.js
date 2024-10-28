

const DEFAULT_INSTRUCT_HELP = `
  Use the << and >> buttons to flip through the sections. You have
  to follow all the instructions on a page before you can advance to the next one.
  If you get stuck, try clicking << and then >> to start the section over.
`

class Instructions extends Component {
  constructor(options = {}) {
    super({
      promptWidth: 700,
      promptHeight: 100,
      contentWidth: "100%",
      contentHeight: null,
      helpText: DEFAULT_INSTRUCT_HELP,
      debugDivs: false,
      ...options
    })

    this.div = $("<div>").css({
      position: "relative",
      width: "100%",
      border: this.debugDivs ? "1px solid black" : "none",
    })

    this.btnHelp = $("<button>")
      .appendTo(this.div)
      .addClass("btn-help")
      .text("?")
      .css({
        position: "absolute",
        right: "0px",
        top: "10px",
      })
      .click(async () => {
        await Swal.fire({
          title: "Help",
          html: this.helpText,
          icon: "info",
          confirmButtonText: "Got it!",
        })
      })

    this.top = $("<div>")
      .css({
        position: "relative",
        margin: "auto",
        minHeight: this.promptHeight,
        width: this.promptWidth,
        marginTop: "10px",
        marginBottom: "20px",
        border: this.debugDivs ? "1px solid red" : "none",
      })
      .appendTo(this.div)

    this.btnPrev = $("<button>")
      .addClass("btn")
      .text("<<")
      .css({
        position: "absolute",
        top: "20px",
        left: "-80px",
      })
      .click(() => this.runPrev())
      .prop("disabled", true)
      .appendTo(this.top)

    this.btnNext = $("<button>")
      .addClass("btn")
      .text(">>")
      .css({
        position: "absolute",
        top: "20px",
        right: "-80px",
      })
      .click(() => this.runNext())
      .prop("disabled", true)
      .appendTo(this.top)

    this.title = $("<h1>").addClass("text").appendTo(this.top)

    this.prompt = $("<div>").addClass("text").appendTo(this.top)

    this.content = $("<div>")
      .css({
        width: this.contentWidth,
        minHeight: this.contentHeight,
        position: "relative",
        margin: "auto",
        padding: "10px",
        border: this.debugDivs ? "1px solid blue" : "none",
      })
      .appendTo(this.div)

    this.stage = 1
    this.maxStage = 1
    this.stages = Object.getOwnPropertyNames(Object.getPrototypeOf(this))
      .filter((f) => f.startsWith("stage"))
      .map((f) => this[f])

    this.completed = deferredPromise()
    this.promises = []
    this.eventCallbacks = []
  }

  async _run(stage) {
    if (stage == undefined && urlParams.instruct) {
      // if the stage is not provided, use the URL parameter if it exists
      stage = urlParams.instruct
    }
    if (stage && isNaN(stage)) {
      // if the stage is not a number, treat it as a name
      stage =
        this.stages.findIndex(
          (s) => s.name === stage || s.name === `stage_${stage}`
        ) + 1
    } else if (stage) {
      stage = parseInt(stage)
    }
    this.runStage(stage)
    await this.completed
  }

  setPrompt(md) {
    this.prompt.html(markdown(md))
  }

  appendPrompt(md) {
    this.prompt.append(markdown(md))
  }

  /**
   * Add a button to the prompt and awaits the user to click it
   * @param {string} text - button text
   * @param {object} opts - button options, passed to button()
   * @returns {Promise} resolves when button is clicked
   */
  continue(text = "continue", opts = {}) {
    _.defaults(opts, { delay: 0 })
    return button(this.prompt, text, opts).promise()
  }

  /**
   * Run a specific stage
   * @param {number} stage - stage number (1-indexed)
   */
  async runStage(stage) {
    if (stage === undefined) {
      stage = this.stage
    } else if (isNaN(stage) || stage < 1 || stage > this.stages.length) {
      alert("Invalid stage! Resetting to previous stage.")
      stage = this.stage
    }
    this.recordEvent('runStage', {stage})
    DATA.save()
    this.rejectPromises()
    this.cancelEventCallbacks()
    this.prompt.empty()
    this.content.empty()
    this.maxStage = Math.max(this.maxStage, stage)
    this.stage = stage
    this.btnNext.prop("disabled", this.stage >= this.maxStage)
    this.btnPrev.prop("disabled", this.stage <= 1)
    this.title.text(`Instructions (${this.stage}/${this.stages.length})`)

    await this.stages[stage - 1].bind(this)()
    if (this.stage == stage) {
      // check to make sure we didn't already move forward
      this.enableNext()
    }
  }

  runNext() {
    this.recordEvent("runNext")
    this.btnNext.removeClass("btn-pulse")
    if (this.stage == this.stages.length) {
      this.recordEvent("completed")
      psiturk.finishInstructions()
      DATA.save()
      this.completed.resolve()
      this.div.remove()
    } else {
      this.runStage(this.stage + 1)
    }
  }

  runPrev() {
    this.recordEvent("runPrev")
    this.runStage(this.stage - 1)
  }

  enableNext() {
    this.btnNext.addClass("btn-pulse")
    this.maxStage = this.stage + 1
    this.btnNext.prop("disabled", false)
  }

}
