
//#region INSTRUCTIONS ********************************************************

const DEFAULT_INSTRUCT_HELP = `
  Use the << and >> buttons to flip through the sections. You have
  to follow all the instructions on a page before you can advance to the next one.
  If you get stuck, try clicking << and then >> to start the section over.
`

class Instructions {
  /**
   * Create an Instructions instance.
   * Stages of the instructions are defined as methods that begin with `stage_`.
   * Stages run in the order that they're defined
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
      stage =
        this.stages.findIndex(
          (s) => s.name === stage || s.name === `stage_${stage}`
        ) + 1
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
    logEvent(`instructions.runStage.${stage}`, {
      stage: this.stages[stage - 1].name,
    })
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
      throw new Error("promise must have reject method")
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

//#endregion

//#region BASIC INTERACTION ELEMENTS (text, buttons, sliders, alerts) *********

// default names; you should probably pass names though
const _input_counters = {}
function nextInputName(type) {
  let name = {
    Button: "button",
    TextBox: "text",
    RadioButton: "radio",
    Slider: "slider",
  }[type]
  let n = _input_counters[name] ?? 1
  _input_counters[name] = n + 1
  return name + n
}

function getInputValues(obj) {
  return _.mapValues(obj, (o) => o.val())
}

class Input {
  constructor({ name = undefined } = {}) {
    this.div = $("<div>")
    this.name = name ?? nextInputName(this.constructor.name)
  }
  appendTo(div) {
    this.div.appendTo(div)
    return this
  }
  remove() {
    this.div.remove()
  }
}

class Button extends Input {
  constructor(options = {}) {
    const { text = "continue", delay = 100, name = undefined, persistent = false } = options
    super({ name })
    this.div.css("text-align", "center")

    this.button = $("<button>", { class: "btn btn-primary" })
      .text(text)
      .appendTo(this.div)

    this.clicked = makePromise()
    this.button.click(async () => {
      this.button.prop("disabled", true)
      logEvent("input.button.click", { name: this.name, text })
      await sleep(delay)
      this.clicked.resolve()
      if (!persistent) {
        this.button.remove()
      }
    })
  }
  promise() {
    return this.clicked
  }
  click(f) {
    this.button.click(f)
    return this
  }
  css(...args) {
    this.button.css(...args)
    return this
  }
}

class TextBox extends Input {
  constructor({
    height = 100,
    width = "500px",
    prompt = "",
    name = undefined,
  } = {}) {
    super({ name })
    this.prompt = $("<p>").css("margin-top", 20).html(prompt).appendTo(this.div)

    this.textarea = $("<textarea>")
      .css({
        // margin: '10px 10%',
        padding: "10px",
        width,
        height,
      })
      .appendTo(this.div)
      .focus()
      .focus(() => logEvent("input.text.focus", { name: this.name }))

    this.textarea.blur(() => {
      logEvent("input.text.blur", { name: this.name, text: this.val() })
    })
  }
  val() {
    return this.textarea.val()
  }
}

class RadioButtons extends Input {
  constructor({ prompt = "", choices = ["yes", "no"], name = undefined } = {}) {
    super({ name })

    this.prompt = $("<p>").css("margin-top", 20).html(prompt).appendTo(this.div)

    let btnDiv = $("<div>").appendTo(this.div)
    for (let choice of choices) {
      $("<input>")
        .attr({
          type: "radio",
          id: choice,
          name: this.name,
          value: choice,
        })
        .appendTo(btnDiv)
        .click(() =>
          logEvent("input.radio.click", { name: this.name, value: choice })
        )

      $("<label>")
        .attr("for", this.name + choice)
        .text(choice)
        .css({ marginLeft: 5, marginRight: 10 })
        .appendTo(btnDiv)
    }
  }

  promise() {
    let promise = makePromise()
    this.buttons().click(() => promise.resolve(this.val()))
    return promise
  }
  buttons() {
    return $(`input[name="${this.name}"]`)
  }
  val() {
    return $(`input[name="${this.name}"]:checked`).val()
  }
  click(f) {
    this.buttons().click(() => {
      f(this.val())
    })
  }
}

class Slider extends Input {
  constructor({
    prompt = "",
    min = 0,
    max = 100,
    step = 1,
    value = 50,
    name = undefined,
    leftLabel = "",
    rightLabel = "",
  } = {}) {
    super({ name })

    this.prompt = $("<p>").css("margin-top", 20).html(prompt).appendTo(this.div)

    // Create container div to hold the slider and labels
    this.sliderContainer = $("<div>").appendTo(this.div).css({
      width: 500,
      marginBottom: 50,
    })

    this.slider = $("<input>")
      .attr({
        type: "range",
        min: min,
        max: max,
        step: step,
        value: value,
        id: this.name,
      })
      .appendTo(this.sliderContainer)
      .on("change", () => {
        logEvent("input.slider.change", {
          name: this.name,
          value: this.slider.val(),
        })
      })

    this.leftLabel = $("<label>")
      .text(leftLabel)
      .appendTo(this.sliderContainer)
      .css({
        // 'display': 'block',
        float: "left",
        // 'text-align': 'center'
      })

    this.rightLabel = $("<label>")
      .text(rightLabel)
      .appendTo(this.sliderContainer)
      .css({
        float: "right",
        // 'display': 'block',
        // 'text-align': 'center'
      })
  }

  promise() {
    let promise = makePromise()
    this.slider.on("input", () => promise.resolve(this.val()))
    return promise
  }

  val() {
    return this.slider.val()
  }

  change(callback) {
    this.slider.on("input", () => {
      callback(this.val())
    })
  }
}

function text_box(div, prompt, opts) {
  return new TextBox({ prompt, ...opts }).appendTo(div)
}

function button(div, text, opts) {
  return new Button({ text, ...opts }).appendTo(div)
}

function radio_buttons(div, prompt, choices, opts) {
  return new RadioButtons({ prompt, choices, ...opts }).appendTo(div)
}

function alert_info(opts = {}) {
  return Swal.fire({
    title: "Hint",
    icon: "info",
    confirmButtonText: "Got it!",
    allowOutsideClick: false,
    ...opts,
  })
}

function alert_success(opts = {}) {
  let flavor = _.sample([
    "you're on fire",
    "top-notch stuff",
    "absolutely brilliant",
    "out of this world",
    "phenomenal",
    "you've outdone yourself",
    "A+ work",
    "nailed it",
    "rock star status",
    "most excellent",
    "impressive stuff",
    "smashed it",
    "genius",
    "spot on",
    "gold, pure gold",
    "bang-up job",
    "exceptional",
    "superb",
    "you're a natural",
    "knocked it out of the park",
  ])
  return Swal.fire({
    title: "Success!",
    html: `<em>${flavor}!</em>`,
    icon: "success",
    confirmButtonText: "Continue",
    allowOutsideClick: false,
    ...opts,
  })
}

function alert_failure(opts = {}) {
  let flavor = _.sample([
    "better luck next time",
    "shake it off and try again",
    "failure is the spice that gives success its flavor",
    "just a little detour on the road to greatness",
    "everyone likes an underdog, get back in there",
  ])
  return Swal.fire({
    title: "Let's try the next one",
    html: `<em>${flavor}!</em>`,
    icon: "error",
    confirmButtonText: "Continue",
    allowOutsideClick: false,
    ...opts,
  })
}

//#endregion

//#region INTERFACE WRAPPERS (trial counter, gallery, drawing) **********************

class TopBar {
  constructor(options = {}) {
    _.defaults(options, {
      nTrial: undefined,
      width: 1100,
      height: 100,
      help: "",
      bonus: undefined,
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

    if (this.bonus) {
      this.bonusText = $("<div>")
        .css({
          "font-weight": "bold",
          "font-size": "16pt",
        })
        .appendTo(this.div)
        .text(`Points: ${this.bonus.points}`)
      registerEventCallback((data) => {
        if (data.event == "bonus.addPoints") {
          this.bonusText.text(`Points: ${data.total}`)
        }
      })
    }

    if (this.help) {
      this.helpButton = $("<button>")
        .appendTo(this.div)
        .addClass("btn-help")
        .text("?")
        .click(async () => {
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

class Gallery {
  constructor(div, items, onShow) {
    this.items = items
    this.onShow = onShow.bind(this)

    this.div = $("<div>")
      .css({
        position: "relative",
        margin: "auto",
        width: "1200px",
        "text-align": "center",
      })
      .appendTo(div)

    this.top = $("<div>").css("margin-bottom", 20).appendTo(this.div)

    this.btnPrev = $("<button>")
      .addClass("btn")
      .text("<<")
      .css({
        display: "inline-block",
      })
      .appendTo(this.top)

    this.title = $("<h2>")
      .css({
        "margin-left": 30,
        "margin-right": 30,
        display: "inline-block",
        "min-width": 200,
      })
      .appendTo(this.top)

    this.btnNext = $("<button>")
      .addClass("btn")
      .text(">>")
      .css({
        display: "inline-block",
      })
      .appendTo(this.top)

    this.content = $("<div>")
      .css({
        width: "1200px",
        // border: 'thick black solid'
      })
      .appendTo(this.div)
    this.listener = new EventListeners()
  }

  setTitle(txt) {
    this.title.text(txt)
  }

  showItem(i) {
    this.onShow(this.items[i])
    this.btnPrev.unbind("click")
    this.btnPrev.click(() => {
      this.showItem(mod(i - 1, this.items.length))
    })
    this.btnNext.unbind("click")
    this.btnNext.click(() => {
      this.showItem(mod(i + 1, this.items.length))
    })
    this.listener.on("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        this.listener.clear()
        this.showItem(mod(i - 1, this.items.length))
      } else if (event.key === "ArrowRight") {
        this.listener.clear()
        this.showItem(mod(i + 1, this.items.length))
      }
    })
  }
}

class Canvas {
  constructor(options = {}) {
    Object.assign(this, {
      width: 600,
      height: 400,
      border: "3px solid black",
      ...options,
    })
    this.wrapper = $("<div>").css({
      border: this.border,
      display: "inline-block",
      margin: "auto",
      position: "relative",
      textAlign: "center",
    })
    this.canvas = $("<canvas>")
      .attr({ width: this.width, height: this.height })
      .appendTo(this.wrapper)
    this.ctx = this.canvas[0].getContext("2d")
  }

  attach(display) {
    this.wrapper.appendTo(display)
    return this
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height)
    return this
  }

  drawCircle(x, y, radius, color) {
    this.ctx.fillStyle = color
    this.ctx.beginPath()
    this.ctx.arc(x, y, radius, 0, 2 * Math.PI)
    this.ctx.fill()
    return this
  }

  drawCross(x, y, size, color) {
    this.ctx.strokeStyle = color
    this.ctx.lineWidth = 2
    this.ctx.beginPath()
    this.ctx.moveTo(x - size, y - size)
    this.ctx.lineTo(x + size, y + size)
    this.ctx.moveTo(x + size, y - size)
    this.ctx.lineTo(x - size, y + size)
    this.ctx.stroke()
    return this
  }

  getClick() {
    return new Promise((resolve) => {
      this.canvas.one("click", (event) => {
        const rect = this.canvas[0].getBoundingClientRect()
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top
        resolve({ x, y })
      })
    })
  }

  drawRect(x, y, width, height, color, fill = true) {
    this.ctx.beginPath()
    if (fill) {
      this.ctx.fillStyle = color
      this.ctx.fillRect(x, y, width, height)
    } else {
      this.ctx.strokeStyle = color
      this.ctx.strokeRect(x, y, width, height)
    }
    return this
  }

  drawLine(x1, y1, x2, y2, color, lineWidth = 1) {
    this.ctx.beginPath()
    this.ctx.moveTo(x1, y1)
    this.ctx.lineTo(x2, y2)
    this.ctx.strokeStyle = color
    this.ctx.lineWidth = lineWidth
    this.ctx.stroke()
    return this
  }

  drawText(text, x, y, options = {}) {
    const {
      font = "12px Arial",
      color = "black",
      align = "center",
      baseline = "middle",
    } = options
    this.ctx.font = font
    this.ctx.fillStyle = color
    this.ctx.textAlign = align
    this.ctx.textBaseline = baseline
    this.ctx.fillText(text, x, y)
    return this
  }

  drawPolygon(points, color, fill = true) {
    this.ctx.beginPath()
    this.ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y)
    }
    this.ctx.closePath()
    if (fill) {
      this.ctx.fillStyle = color
      this.ctx.fill()
    } else {
      this.ctx.strokeStyle = color
      this.ctx.stroke()
    }
    return this
  }
}

//#endregion

//#region EXPERIMENT ASSIGNMENT ************************************************

class ConditionBuilder {
  constructor(condition) {
    this.state = condition
  }

  choose(choices, { rand = false, pop = false } = {}) {
    let indices = (arr) => [...arr.keys()]
    let range = (n) => indices(Array(n))
    let randInt = (n) => Math.floor(Math.random() * n)

    if (typeof choices == "number") {
      choices = range(choices)
    }
    let i
    if (rand) {
      i = randInt(choices.length)
    } else {
      i = this.state % choices.length
      this.state = Math.floor(this.state / choices.length)
    }
    return pop ? choices.splice(i, 1)[0] : choices[i]
  }

  chooseMulti(choicesObj) {
    let result = {}
    for (let [key, choices] of Object.entries(choicesObj)) {
      if (Array.isArray(choices)) {
        result[key] = this.choose(choices)
      } else {
        result[key] = choices
      }
    }
    return result
  }
}

function conditionParameters(condition, choicesObj) {
  return new ConditionBuilder(condition).chooseMulti(choicesObj)
}

class Bonus {
  constructor(options) {
    let { points_per_cent, initial = 0 } = options
    assert(
      typeof points_per_cent == "number",
      `points_per_cent must be a number, but is ${JSON.stringify(points_per_cent)}`
    )
    assert(
      typeof initial == "number",
      `initial must be a number, but is ${JSON.stringify(points_per_cent)}`
    )
    this.points = this.initial = initial
    this.points_per_cent = points_per_cent
  }
  addPoints(points) {
    this.points += points
    logEvent("bonus.addPoints", { points, total: this.points })
  }
  dollars() {
    let cents = Math.max(0, Math.round(this.points / this.points_per_cent))
    return cents / 100
  }
  reportBonus() {
    return `You current bonus is $${this.dollars().toFixed("2")} (${
      this.points
    } points)`
  }
  describeScheme() {
    return (
      "one cent for every " +
      numString(this.points_per_cent, "point", { skip_one: true })
    )
  }
}
//#endregion

//#region GENERIC HELPERS *****************************************************

function randomUUID() {
  return Date.now() + Math.random().toString(36).substring(2)
}

function uniformRandom(min, max) {
  return min + Math.random() * (max - min)
}

function numString(n, noun, options = {}) {
  if (options.skip_one && n == 1) return noun
  let res = [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
  ][n]
  if (noun) {
    if (n != 1) {
      noun += "s"
    }
    res += " " + noun
  }
  return res
}

function enforceScreenSize(width, height, display = "#display") {
  display = $(display)
  let warning = $("<div>")
    .addClass("alert alert-warning center")
    .css({
      width: 400,
      // 'position': 'absolute',
      // 'top': '30%',
      margin: "auto",
      "margin-top": "100px",
    })
    .appendTo(document.body)

  function resetWarning() {
    warning
      .html(
        `
      <h4>Screen too small</h4>

      <p>Your window isn't big enough to run the experiment. Please try expanding the window.
      It might help to use full screen mode.
    `
      )
      .hide()

    $("<button>")
      .addClass("btn btn-primary")
      .css("margin-top", "20px")
      .text("enter fullscreen")
      .appendTo(warning)
      .click(async () => {
        document.documentElement.requestFullscreen()
        await sleep(1000)
        warning.html(`
        <h4>Darn, still not big enough!</h4>

        <p>You can also try zooming out a bit with <code>cmd/ctrl minus</code>.
      `)
      })
  }
  resetWarning()

  function enforcer() {
    if (window.innerWidth < width || window.innerHeight < height) {
      warning.show()
      display.hide()
    } else {
      warning.hide()
      resetWarning()
      display.show()
    }
  }
  window.addEventListener("resize", enforcer)
  enforcer()
  return enforcer
}

function makePromise() {
  let resolve, reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  promise.resolve = resolve
  promise.reject = reject
  return promise
}

function sleep(ms, name="sleep") {
  return new Promise(resolve => setTimeout(() => resolve(name), ms))
}

function hex2rgb(hex) {
  // Convert hex color to rgb
  let r = parseInt(hex.slice(1, 3), 16)
  let g = parseInt(hex.slice(3, 5), 16)
  let b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

class EventListeners {
  constructor() {
    this.listeners = []
  }
  on(type, handler, options) {
    this.listeners.push([type, handler, options])
    document.addEventListener(type, handler, options)
  }
  clear() {
    for (let [ltype, handler, options] of this.listeners) {
      document.removeEventListener(ltype, handler, options)
    }
    this.listeners.length = 0 // weird way to clear an array
  }
}
const globalListeners = new EventListeners()

function updateExisting(target, src) {
  Object.keys(target).forEach(
    (k) => (target[k] = src.hasOwnProperty(k) ? src[k] : target[k])
  )
}

function maybeJson(s) {
  try {
    return JSON.parse(s)
  } catch (error) {
    return s
  }
}

function mod(n, k) {
  return ((n % k) + k) % k
}

const cartesian = (...a) =>
  a.reduce((a, b) => a.flatMap((d) => b.map((e) => [d, e].flat())))

const converter = new showdown.Converter()

function markdown(txt) {
  // Remove leading spaces so as not to interpret indented
  // blocks as code blocks. Use fenced code blocks instead.
  return converter.makeHtml(txt.replace(/^[ ]+/gm, ""))
}
function checkKeysDefined(obj, keys) {
  var i, k, len
  if (keys == null) {
    keys = Object.keys(obj)
  }
  for (i = 0, len = keys.length; i < len; i++) {
    k = keys[i]
    if (obj[k] === void 0) {
      throw new Error(`${k} is undefined in object ${JSON.stringify(obj)}`)
    }
  }
  return obj
}

function checkDefined(name, val) {
  if (val === void 0) {
    throw new Error(`${name} is undefined`)
  }
  return val
}

function assert(val, msg = "(no details)") {
  if (!val) {
    throw new Error("Assertion Error: " + msg)
  }
  return val
}
