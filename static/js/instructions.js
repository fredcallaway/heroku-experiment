const DEFAULT_INSTRUCT_HELP = `
  Use the << and >> buttons to flip through the sections. You have
  to follow all the instructions on a page before you can advance to the next one.
  If you get stuck, try clicking << and then >> to start the section over.
`

class Instructions {
  /**
   * Create an Instructions instance
   * Testing tip: add ?instruct=X to the URL to start on a specific stage; X can be a stage name or number
   * @param {Object} options - Configuration options
   * @param {number} [options.promptWidth=700] - Width of the prompt area
   * @param {number} [options.promptHeight=100] - Minimum height of the prompt area
   * @param {string} [options.contentWidth="100%"] - Width of the content area
   * @param {number|null} [options.contentHeight=null] - Minimum height of the content area; null for auto
   * @param {string} [options.helpText=DEFAULT_INSTRUCT_HELP] - Help text to display when the ? button is clicked
   * @param {boolean} [options.debugDivs=false] - Whether to show borders around divs (helpful for debugging layout issues)
   */
  constructor(options = {}) {
    _.defaults(options, {
      promptWidth: 700,
      promptHeight: 100,
      contentWidth: "100%",
      contentHeight: null,
      helpText: DEFAULT_INSTRUCT_HELP,
      debugDivs: false,
    })

    this.options = options

    this.div = $("<div>").css({
      position: "relative",
      width: "100%",
      border: options.debugDivs ? "1px solid black" : "none",
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
          html: options.helpText,
          icon: "info",
          confirmButtonText: "Got it!",
        })
      })

    this.top = $("<div>")
      .css({
        position: "relative",
        margin: "auto",
        minHeight: options.promptHeight,
        width: options.promptWidth,
        marginTop: "10px",
        marginBottom: "20px",
        border: options.debugDivs ? "1px solid red" : "none",
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
        width: options.contentWidth,
        minHeight: options.contentHeight,
        position: "relative",
        margin: "auto",
        padding: "10px",
        border: options.debugDivs ? "1px solid blue" : "none",
      })
      .appendTo(this.div)

    this.stage = 1
    this.maxStage = 1
    this.stages = Object.getOwnPropertyNames(Object.getPrototypeOf(this))
      .filter((f) => f.startsWith("stage"))
      .map((f) => this[f])

    this.completed = makePromise()
    this.promises = []
    this.eventCallbacks = []
  }

  /**
   * Attach to a display element
   * @param {object} display - display element (usually DISPLAY)
   * @returns {Instructions} this instance for chaining
   */
  attach(display) {
    display.empty()
    this.div.appendTo(display)
    return this
  }

  /**
   * Run the instructions
   * @param {object} display - display element (usually DISPLAY)
   * @param {number} stage - stage number to start on
   * @returns {Promise} resolves when instructions are completed
   */
  async run(display, stage) {
    if (display) this.attach(display)
    if (stage == undefined && urlParams.instruct) {
      stage = urlParams.instruct
    }
    if (isNaN(stage)) {
      // if the stage is not a number, treat it as a name
      stage = this.stages.findIndex(s => s.name === stage || s.name === `stage_${stage}`) + 1
    } else {
      stage = parseInt(stage)
    }
    console.log("stage", stage)
    this.runStage(stage)
    await this.completed
  }

  /**
   * Set the prompt text
   * @param {string} md - markdown text
   */
  setPrompt(md) {
    this.prompt.html(markdown(md))
  }

  /**
   * Append to the prompt text
   * @param {string} md - markdown text
   */
  appendPrompt(md) {
    this.prompt.append(markdown(md))
  }

  /**
   * Add a button to the prompt and awaits the user to click it
   * @param {string} text - button text
   * @param {object} opts - button options, passed to button()
   * @returns {Promise} resolves when button is clicked
   */
  async button(text = "continue", opts = {}) {
    _.defaults(opts, { delay: 0 })
    let btn = button(this.prompt, text, opts)
    await this.registerPromise(btn.clicked)
    btn.remove()
  }

  /**
   * Run a specific stage
   * @param {number} stage - stage number (1-indexed)
   */
  async runStage(stage) {
    console.log("runStage", stage)
    if (isNaN(stage) || stage < 1 || stage > this.stages.length) {
      alert("Invalid stage! Resetting to previous stage.")
      stage = this.stage
    }
    console.log("runStage", stage)
    logEvent(`instructions.runStage.${stage}`, { stage: this.stages[stage - 1].name })
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
    saveData()
    logEvent("instructions.runNext")
    this.btnNext.removeClass("btn-pulse")
    if (this.stage == this.stages.length) {
      logEvent("instructions.completed")
      psiturk.finishInstructions()
      this.completed.resolve()
      this.div.remove()
    } else {
      this.runStage(this.stage + 1)
    }
  }

  runPrev() {
    logEvent("instructions.runPrev")
    this.runStage(this.stage - 1)
  }

  enableNext() {
    this.btnNext.addClass("btn-pulse")
    this.maxStage = this.stage + 1
    this.btnNext.prop("disabled", false)
  }

  /**
   * Register a promise to be rejected when stage changes
   * @param {Promise} promise - promise to register
   * @returns {Promise} the registered promise
   */
  registerPromise(promise) {
    if (!promise.reject) {
      assert(false, "promise must have reject method")
    }
    this.promises.push(promise)
    return promise
  }

  /**
   * Create and register an event promise (see registerPromise and eventPromise)
   * Using this wrapper ensures that promises are automatically removed when the stage changes
   * @param {...any} args - arguments for eventPromise
   * @returns {Promise} the registered event promise
   */
  eventPromise(...args) {
    return this.registerPromise(eventPromise(...args))
  }

  /**
   * Create and register a sleep promise (see registerPromise)
   * @param {number} ms - milliseconds to sleep
   * @returns {Promise} the registered sleep promise
   */
  sleep(ms) {
    return this.registerPromise(sleep(ms))
  }

  /**
   * Register an event callback (see registerEventCallback)
   * Using this wrapper ensures that callbacks are automatically removed when the stage changes
   * @param {Function} callback - event callback to register
   */
  registerEventCallback(callback) {
    this.eventCallbacks.push(callback)
    registerEventCallback(callback)
  }

  /**
   * Reject all registered promises
   */
  rejectPromises() {
    for (const promise of this.promises) {
      promise.reject()
    }
    this.promises = []
  }

  /**
   * Cancel all registered event callbacks
   */
  cancelEventCallbacks() {
    for (const callback of this.eventCallbacks) {
      removeEventCallback(callback)
    }
    this.eventCallbacks = []
  }
}

class ExampleInstructions extends Instructions {
  constructor(options = {}) {
    super(options)

    if (!PARAMS.showSecretStage) {
      this.stages = this.stages.filter((stage) => {
        return stage.name != "stage_conditional"
      })
    }
  }

  // the stages run in the order that they're defined
  // you can jump to a specific stage using it's position e.g.
  // http://127.0.0.1:8000/?instruct=2

  async stage_welcome() {
    this.setPrompt(`
      Thanks for participating! We'll start with some quick instructions.

      _use the arrows above to navigate_
    `)
  }

  async stage_conditional() {
    this.setPrompt("You will only see this if `PARAMS.showSecretStage` is true")
  }

  async stage2() {
    this.setPrompt(`
      In this experiment, you will do many things!
    `)
    await this.button()

    this.setPrompt(`
      For example, you will press buttons.
    `)
    await this.button("button")

    // this.prompt is a jquery object
    this.prompt.empty()

    this.setPrompt(`
      You might have to answer questions too. Is that okay?
    `)

    let radio = new RadioButtons({
      choices: ["yes", "no"],
      name: "answer okay",
    }).appendTo(this.prompt)

    // we wait for user input before continuing
    // promise() always returns a Promise (something you can await)
    let click = this.registerPromise(radio.promise())
    // buttons() is a jquery selector so you can use any jquery magic you want here
    radio.buttons().prop("disabled", true)
    // in general, all interactions with the classes in inputs.js
    // will be automatically logged (saved to database)

    if (click == "yes") {
      this.appendPrompt("Glad to hear it!")
    } else {
      this.appendPrompt("Well at least you're willing to do it anyway.")
    }
  }

  async stage_1_badly_named() {
    this.setPrompt("Sometimes there will be fun alerts!")
    await this.button("...")
    await alert_success() // wait for confirm
  }

  async stage_content() {
    this.setPrompt("We might embed the task into the instructions.")
    $("<div>")
      .css({
        margin: "auto",
        width: "800px",
        height: "300px",
        border: "3px solid black",
        textAlign: "center",
        fontWeight: "bold",
        paddingTop: "30px",
      })
      .html("404 Task Not Found")
      .appendTo(this.content)
  }

  async stage_final() {
    // I suggest keeping something like this here to warn participants to not refresh

    this.setPrompt(`
      In the rest of the experiment, yada yada...

      <br><br>
      <div class="alert alert-danger">
        <b>Warning!</b><br>
        Once you complete the instructions, <strong>you cannot refresh the page</strong>.
        If you do, you will get an error message and you won't be able to complete the
        study.
      </div>
    `)
    let question =
      "Are you going to refresh the page after completing the instructions?"
    let radio = radio_buttons(this.prompt, question, ["yes", "no"])
    let post = $("<div>").appendTo(this.prompt)
    let no = makePromise()
    let done = false
    radio.click((val) => {
      if (val == "yes") {
        post.html("Haha... But seriously.")
      } else {
        no.resolve()
      }
    })
    await no
    radio.buttons().off()
    radio.buttons().prop("disabled", true)
    post.html("Good. No refreshing!")
    await this.button("finish instructions")
    this.runNext() // don't make them click the arrow
  }
}
