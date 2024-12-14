function getInputValues(obj) {
  return _.mapValues(obj, (o) => o.val())
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

function slider(div, prompt, opts) {
  return new Slider({ prompt, ...opts }).appendTo(div)
}

function button_array(div, prompt, buttonDefs, opts) {
  return new ButtonArray(buttonDefs, {prompt, ...opts}).appendTo(div)
}

function _normalizeName(name) {
  if (name === undefined) return undefined
  return name.split(' ').slice(0, 3).join('_').toLowerCase().replace(/[^a-z0-9_]/g, '')
}

// Maybe this should extend Component?
class Input {
  promiseEvent = "click"
  eventPrefix = undefined
  constructor(options) {
    this.ogOptions = _.clone(options)
    if (this.eventPrefix === undefined) {
      this.eventPrefix = 'input.' + _normalizeName(this.constructor.name)
    }
    let name = options.name
    if (!name) {
      name = this.eventPrefix
      if (options.text) {
        name += '-' + _normalizeName(options.text)
      } else if (options.prompt) {
        name += '-' + _normalizeName(options.prompt)
      }
      name = makeUniqueID(name)
    }
    assert(typeof name == "string", "name must be a string")
    this.name = name
    this.options = options
    this.recordEvents = options.recordEvents ?? true
    this.div = $("<div>")
    isInDOMPromise(this.div).then(() => {
      this.recordEvent("display", this.ogOptions)
    })
  }
  recordEvent(event, info = {}) {
    if (!this.recordEvents) return
    if (typeof info != "object") {
      info = { info }
    }
    DATA.recordEvent(this.eventPrefix + "." + event, {
      name: this.name,
      ...info,
    })
  }
  inputSelector() {
    // override in subclasses -> must return jquery object
    return this.div.children().last()
  }
  val() {
    return this.inputSelector().val()
  }
  on(...args) {
    this.inputSelector().on(...args)
    return this
  }
  one(...args) {
    this.inputSelector().one(...args)
    return this
  }
  off(...args) {
    this.inputSelector().off(...args)
    return this
  }
  promise(events = this.promiseEvent) {
    let d = deferredPromise()
    this.one(events, () => d.resolve(this.val()))
    return d
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
  defaultName = "button"
  constructor(options = {}) {
    super(options)
    _.defaults(options, {
      text: "continue",
      delay: 100,
      persistent: false,
      class: "btn",
      kind: "primary",
      align: "center"
    })

    this.div.css({
      textAlign: options.align,
      margin: 10
    })

    this.button = $("<button>", { id: this.name })
      .addClass(options.class)
      .addClass("btn-" + options.kind)
      .text(options.text)
      .appendTo(this.div)
      .on("click", async () => {
        if (!options.noRecord) {
          DATA.recordEvent("input.button.click", { name: this.name, text: options.text})
        }
        this.button.prop("disabled", true)
        await sleep(options.delay)
        if (!options.persistent) {
          this.button.remove()
        } else {
          this.button.prop("disabled", false)
        }
      })
  }
  val() {
    // we could do number of clicks or something, but this is more useful
    // for promises (we resolve with the text of the button)
    return this.options.text
  }
  css(...args) {
    this.button.css(...args)
    return this
  }
}

class TextBox extends Input {
  defaultName = "textbox"
  constructor(options = {}) {
    super(options)
    _.defaults(options, {
      height: 100,
      width: "500px",
      prompt: ""
    })

    this.div.css("text-align", "center")

    this.prompt = $("<p>").css({ paddingBottom: 10 }).html(options.prompt).appendTo(this.div)

    this.textarea = $("<textarea>")
      .css({
        padding: "10px",
        width: options.width,
        height: options.height,
      })
      .appendTo(this.div)
      .focus()
      .focus(() => DATA.recordEvent("input.text.focus", { name: this.name }))
      .blur(() =>
        DATA.recordEvent("input.text.blur", {
          name: this.name,
          text: this.val(),
        })
      )
  }
}

class RadioButtons extends Input {
  defaultName = "radio"
  constructor(options = {}) {
    super(options)
    _.defaults(options, {
      prompt: "",
      choices: ["yes", "no"],
      oneLine: undefined // default: wrap if fewer than 50 characters
    })

    if (options.oneLine === undefined) {
      options.oneLine = options.choices.join('').length < 50
    }

    // this.div.css("text-align", "center")

    this.prompt = $("<p>").html(options.prompt).appendTo(this.div)

    let btnDiv = $("<div>").appendTo(this.div).css('margin-bottom', 15)
    for (let choice of options.choices) {
      $("<input>")
        .attr({
          type: "radio",
          id: choice,
          name: this.name,
          value: choice,
        })
        .appendTo(btnDiv)
        .on("click", () =>
          DATA.recordEvent("input.radio.click", {
            name: this.name,
            value: choice,
          })
        )

      $("<label>")
        .attr("for", this.name + choice)
        .text(choice)
        .css({ marginLeft: 5, marginRight: 10 })
        .appendTo(btnDiv)
      if (!options.oneLine) {
        btnDiv.append('<br>')
      }
    }
  }
  inputSelector() {
    return $(`input[name="${this.name}"]`)
  }
  promise(events) {
    return super.promise(events)
  }
  val() {
    return $(`input[name="${this.name}"]:checked`).val()
  }
}

class Slider extends Input {
  promiseEvent = "change"
  constructor(options = {}) {
    super(options)
    _.defaults(options, {
      prompt: "",
      min: 0,
      max: 100,
      step: 1,
      value: 50,
      leftLabel: "",
      rightLabel: ""
    })

    this.div.css("text-align", "center")

    this.prompt = $("<p>").css({ paddingBottom: 10 }).html(options.prompt).appendTo(this.div)

    this.sliderContainer = $("<div>").appendTo(this.div).css({
      width: 500,
      marginBottom: 50,
    })

    this.slider = $("<input>")
      .attr({
        type: "range",
        min: options.min,
        max: options.max,
        step: options.step,
        value: options.value,
        id: this.name,
      })
      .appendTo(this.sliderContainer)
      .on("change", () => {
        DATA.recordEvent("input.slider.change", {
          name: this.name,
          value: this.slider.val(),
        })
      })

    this.leftLabel = $("<label>")
      .text(options.leftLabel)
      .appendTo(this.sliderContainer)
      .css({
        float: "left",
      })

    this.rightLabel = $("<label>")
      .text(options.rightLabel)
      .appendTo(this.sliderContainer)
      .css({
        float: "right",
      })
  }

  val() {
    return this.slider.val()
  }
}

class ButtonArray extends Input {
  constructor(buttonDefs, options = {}) {
    super(options)
    

    if (options.prompt) {
      this.prompt = $("<p>").css({ paddingBottom: 10 }).html(options.prompt).appendTo(this.div)
      if (options.center) {
        this.prompt.css({
          textAlign: 'center',
          margin: 'auto'
        })
      }
    }
    
    this._result = deferredPromise()
    this.buttonDiv = $("<div>").css({
      display: 'flex',
      flexWrap: 'wrap',
      gap: '10px',
      justifyContent: options.center ? 'center' : 'flex-start',
      // justifyContent: 'center',
      // width: options.width || 'auto'
    }).appendTo(this.div)
    this.buttons = buttonDefs.map((opts, idx) => {
      if (typeof opts === 'string') {
        opts = { text: opts }
      }
      
      let name = this.name + '.' + (opts.name || _normalizeName(opts.text))

      const btn =  new Button({
        ...options,
        ...opts,
        name,
        noRecord: true
      })
      .appendTo(this.buttonDiv)
      btn.promise().then(() => {
        DATA.recordEvent("input.buttonarray.click", { name, idx, text: btn.text })
        this._result.resolve(name)
        this.remove()
      })
      return btn
    })
  }

  promise() {
    return deferredPromise(this._result)
  }

  val() {
    switch (this._result.status) {
      case 'pending':
        return null
      case 'resolved':
        return this._result.val()
      case 'rejected':
        throw new Error('ButtonArray rejected')
    }
  }

  promise() {
    return Promise.any(this.buttons.map(btn => btn.promise()))
  }
}
