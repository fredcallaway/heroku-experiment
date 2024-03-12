const DEFAULT_INSTRUCT_HELP= `
  Use the << and >> buttons to flip through the sections. You have
  to follow all the instructions on a page before you can advance to the next one.
  If you get stuck, try clicking << and then >> to start the section over.
`

class Instructions {
  constructor(options={}) {
    _.defaults(options, {
      width: 1000,
      promptHeight: 100,
      helpText: DEFAULT_INSTRUCT_HELP
    })

    this.options = options

    this.div = $('<div>')
    .css({
      width: options.width,
      position: 'relative',
      margin: 'auto',
      padding: '10px',
    })

    let help = $('<button>')
    .appendTo(this.div)
    .addClass('btn-help')
    .text('?')
    .click(async () => {
      await Swal.fire({
          title: 'Help',
          html: options.helpText,
          icon: 'info',
          confirmButtonText: 'Got it!',
        })
    })

    this.btnPrev = $('<button>')
    .addClass('btn')
    .text('<<')
    .css({
      position: 'absolute',
      top: '20px',
      left: '30px',
    })
    .click(() => this.runPrev())
    .prop('disabled', true)
    .appendTo(this.div)

    this.btnNext = $('<button>')
    .addClass('btn')
    .text('>>')
    .css({
      position: 'absolute',
      top: '20px',
      right: '200px',
    })
    .click(() => this.runNext())
    .prop('disabled', true)
    .appendTo(this.div)

    this.title = $('<h1>')
    .addClass('text').appendTo(this.div)

    this.prompt = $('<div>')
    .addClass('text')
    .css({
      height: options.promptHeight,
      marginTop: 20
    })
    .appendTo(this.div)

    this.content = $('<div>').appendTo(this.div)

    this.stage = 0
    this.maxStage = 0
    this.stages = Object.getOwnPropertyNames(Object.getPrototypeOf(this))
    .filter(f => f.startsWith('stage'))
    .map(f => this[f])

    this.completed = makePromise()

  }

  attach(display) {
    display.empty()
    this.div.appendTo(display)
    return this
  }

  async run(display, stage) {
    if (display) this.attach(display)
    if (stage == undefined && urlParams.instruct) {
      stage = parseInt(urlParams.instruct)
    }
    this.runStage(stage ?? 1)
    await this.completed
  }

  sleep(ms) {
    // this allows us to cancel sleeps when the user flips to a new page
    this._sleep = makePromise()
    sleep(ms).then(() => this._sleep.resolve())
    return this._sleep
  }

  setPrompt(md) {
    this.prompt.html(markdown(md))
  }
  appendPrompt(md) {
    this.prompt.append(markdown(md))
  }

  async button(text='continue', opts={}) {
    _.defaults(opts, {delay: 0})
    let btn = button(this.prompt, text, opts)
    await btn.clicked
    btn.remove()
  }

  async runStage(n) {
    logEvent(`instructions.runStage.${n}`, {stage: this.stages[n-1].name})
    this._sleep?.reject()
    this.prompt.empty()
    this.content.empty()
    this.content.css({opacity: 1}) // just to be safe
    this.maxStage = Math.max(this.maxStage, n)
    this.stage = n
    this.btnNext.prop('disabled', this.stage >= this.maxStage)
    this.btnPrev.prop('disabled', this.stage <= 1)
    this.title.text(`Instructions (${this.stage}/${this.stages.length})`)

    await this.stages[n-1].bind(this)()
    if (this.stage == n) {
      // check to make sure we didn't already move forward
      this.enableNext()
    }
  }

  runNext() {
    saveData()
    logEvent('instructions.runNext')
    this.btnNext.removeClass('btn-pulse')
    if (this.stage == this.stages.length) {
      logEvent('instructions.completed')
      psiturk.finishInstructions();
      this.completed.resolve()
      this.div.remove()
    } else {
      this.runStage(this.stage + 1)
    }
  }

  runPrev() {
    logEvent('instructions.runPrev')
    this.runStage(this.stage - 1)
  }

  enableNext() {
    this.btnNext.addClass('btn-pulse')
    this.maxStage = this.stage + 1
    this.btnNext.prop('disabled', false)
  }
}


class ExampleInstructions extends Instructions {
  constructor(options={}) {
    super(options)

    if (!PARAMS.showSecretStage) {
      this.stages = this.stages.filter(stage => {
        return stage.name != 'stage_conditional'
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
    this.setPrompt(
      "You will only see this if `PARAMS.showSecretStage` is true"
    )
  }

  async stage2() {
    this.setPrompt(`
      In this experiment, you will do many things!
    `)
    await this.button()

    this.setPrompt(`
      For example, you will press buttons.
    `)
    await this.button('button')

    // this.prompt is a jquery object
    this.prompt.empty()

    this.setPrompt(`
      You might have to answer questions too. Is that okay?
    `)

    let radio = new RadioButtons({
      choices: ['yes', 'no'],
      name: 'answer okay'
    }).appendTo(this.prompt)

    // we wait for user input before continuing
    // promise() always returns a Promise (something you can await)
    let click = await radio.promise()
    // buttons() is a jquery selector so you can use any jquery magic you want here
    radio.buttons().prop('disabled', true)
    // in general, all interactions with the classes in inputs.js
    // will be automatically logged (saved to database)

    if (click == 'yes') {
      this.appendPrompt("Glad to hear it!")
    } else {
      this.appendPrompt("Well at least you're willing to do it anyway.")
    }
  }

  async stage_1_badly_named() {
    this.setPrompt('Sometimes there will be fun alerts!')
    await this.button('...')
    await alert_success()  // wait for confirm
  }

  async stage_final() {
    // I suggest keeping something like this here to warn participants to not refresh

    this.instruct(`
      In the rest of the experiment, yada yada

      <br><br>
      <div class="alert alert-danger">
        <b>Warning!</b><br>
        Once you complete the instructions, <strong>you cannot refresh the page</strong>.
        If you do, you will get an error message and you won't be able to complete the
        study.
      </div>
    `)
    let question = 'Are you going to refresh the page after completing the instructions?'
    let radio = radio_buttons(this.prompt, question, ['yes', 'no'])
    let post = $('<div>').appendTo(this.prompt)
    let no = makePromise()
    let done = false
    radio.click((val) => {
      if (val == 'yes') {
        post.html("Haha... But seriously.")
      } else {
        no.resolve()
      }
    })
    await no
    radio.buttons().off()
    radio.buttons().prop('disabled', true)
    post.html('Good. No refreshing!')
    await this.button('finish instructions')
    this.runNext() // don't make them click the arrow
  }
}