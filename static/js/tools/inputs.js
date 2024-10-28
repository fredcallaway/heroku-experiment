function getInputValues(obj) {
  return _.mapValues(obj, (o) => o.val())
}

// Maybe this should extend Component?
class Input {
  promiseEvent = "click"
  defaultName = undefined
  constructor(name) {
    this.name =
      name ||
      makeUniqueID(this.defaultName || this.constructor.name, {
        alwaysPostfix: true,
      })
    this.div = $("<div>")
    assert(typeof this.name == "string", "name must be a string")
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
    let {
      text = "continue",
      delay = 100,
      persistent = false,
      className = "btn btn-primary",
    } = options
    super(options.name || text)

    this.div.css("text-align", "center")

    this.button = $("<button>", { id: this.name })
      .addClass(className)
      .text(text)
      .appendTo(this.div)
      .on("click", async () => {
        DATA.recordEvent("input.button.click", { name: this.name, text })
        this.button.prop("disabled", true)
        await sleep(delay)
        if (!persistent) {
          this.button.remove()
        } else {
          this.button.prop("disabled", false)
        }
      })
  }
  val() {
    // we could do number of clicks or something, but this is more useful
    // for promises (we resolve with the name of the button)
    return this.name
  }
  css(...args) {
    this.button.css(...args)
    return this
  }
}

class TextBox extends Input {
  defaultName = "textbox"
  constructor(options = {}) {
    let { height = 100, width = "500px", prompt = "" } = options
    super(name)

    this.div.css("text-align", "center")

    this.prompt = $("<p>").css("margin-top", 20).html(prompt).appendTo(this.div)

    this.textarea = $("<textarea>")
      .css({
        padding: "10px",
        width: width,
        height: height,
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
    let { prompt = "", choices = ["yes", "no"] } = options
    super(options.name)

    // this.div.css("text-align", "center")

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
    let {
      prompt = "",
      min = 0,
      max = 100,
      step = 1,
      value = 50,
      leftLabel = "",
      rightLabel = "",
    } = options
    super(options.name)

    this.div.css("text-align", "center")

    this.prompt = $("<p>").css("margin-top", 20).html(prompt).appendTo(this.div)

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
        DATA.recordEvent("input.slider.change", {
          name: this.name,
          value: this.slider.val(),
        })
      })

    this.leftLabel = $("<label>")
      .text(leftLabel)
      .appendTo(this.sliderContainer)
      .css({
        float: "left",
      })

    this.rightLabel = $("<label>")
      .text(rightLabel)
      .appendTo(this.sliderContainer)
      .css({
        float: "right",
      })
  }

  val() {
    return this.slider.val()
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

function slider(div, prompt, opts) {
  return new Slider({ prompt, ...opts }).appendTo(div)
}
