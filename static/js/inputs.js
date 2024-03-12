
// default names; you should probably pass names though
const _input_counters = {}
function nextInputName(type) {
  let name = {
    'Button': 'button',
    'TextBox': 'text',
    'RadioButton': 'radio',
  }[type]
  let n = _input_counters[name] ?? 1
  _input_counters[name] = n + 1
  return name + n
}

function getInputValues(obj) {
  return _.mapValues(obj, o=>o.val())
}

class Input {
  constructor({name = undefined} = {}) {
    this.div = $('<div>')
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
  constructor({text = 'continue', delay = 100, name=undefined} = {}) {
    super({name})
    this.div.css('text-align', 'center')

    this.button = $('<button>', {class: 'btn btn-primary'})
    .text(text)
    .appendTo(this.div)

    this.clicked = makePromise()
    this.button.click(() => {
      this.button.prop('disabled', true)
      logEvent('input.button.click', {name: this.name, text})
      sleep(delay).then(this.clicked.resolve)
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
  constructor({height=100, width='500px', prompt='', name=undefined} = {}) {
    super({name})
    this.prompt = $("<p>")
    .css('margin-top', 20)
    .html(prompt)
    .appendTo(this.div)

    this.textarea = $('<textarea>')
    .css({
      // margin: '10px 10%',
      padding: '10px',
      width,
      height
    })
    .appendTo(this.div)
    .focus()
    .focus(() => logEvent('input.text.focus', {name: this.name}))


    this.textarea.blur(() => {
      logEvent('input.text.blur', {name: this.name, text: this.val()})
    })
  }
  val() {
    return this.textarea.val()
  }
}

class RadioButtons extends Input {
  constructor({prompt='', choices=['yes', 'no'], name=undefined}={}) {
    super({name})

    this.prompt = $("<p>")
    .css('margin-top', 20)
    .html(prompt)
    .appendTo(this.div)

    let btnDiv = $('<div>').appendTo(this.div)
    for (let choice of choices) {
      $('<input>').attr({
        type: 'radio',
        id: choice,
        name: this.name,
        value: choice,
       }).appendTo(btnDiv)
      .click(() => logEvent('input.radio.click', {name: this.name, value: choice}))

       $('<label>')
       .attr('for', this.name + choice)
       .text(choice)
       .css({marginLeft: 5, marginRight: 10})
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

function text_box(div, prompt, opts) {
  return new TextBox({prompt, ...opts}).appendTo(div)
}

function button(div, text, opts) {
  return new Button({text, ...opts}).appendTo(div)
}

function radio_buttons(div, prompt, choices, opts) {
  return new RadioButtons({prompt, choices, ...opts}).appendTo(div)
}


function alert_success(opts = {}) {
  let flavor = _.sample([
    "you're on fire", "top-notch stuff", "absolutely brilliant",
    "out of this world", "phenomenal", "you've outdone yourself", "A+ work",
    "nailed it", "rock star status", "most excellent", "impressive stuff",
    "smashed it", "genius", "spot on", "gold, pure gold",
    "bang-up job", "exceptional", "superb", "you're a natural", "knocked it out of the park"
  ])
  return Swal.fire({
    title: 'Success!',
    html: `<em>${flavor}!</em>`,
    icon: 'success',
    confirmButtonText: 'Continue',
    ...opts
  })
}

function alert_failure(opts = {}) {
  let flavor = _.sample([
    "better luck next time",
    "shake it off and try again",
    "failure is the spice that gives success its flavor",
    "just a little detour on the road to greatness",
    "everyone likes an underdog, get back in there"
  ])
  return Swal.fire({
    title: "Let's try the next one",
    html: `<em>${flavor}!</em>`,
    icon: 'error',
    confirmButtonText: 'Continue',
    ...opts
  })

}

class TopBar {
    constructor(options = {}) {
    _.defaults(options, {
      nTrial: undefined,
      width: 1100,
      height: 100,
      help: '',
    })
    Object.assign(this, options)

    this.div = $('<div>')
    .css({
      height: this.height,
      width: this.width,
      margin: 'auto',
      position: 'relative',
      'user-select': 'none',
      // 'margin-bottom': '20px',
      // 'margin-top': '20px'
    })

    if (this.nTrial) {
      this.counter = $('<div>')
      .addClass('left')
      .css({
        'margin-top': '20px',
        'font-weight': 'bold',
        'font-size': '16pt'
      })
      .appendTo(this.div)
      this.count = 1
      this.setCounter(this.count)
    }

    if (this.help) {
      this.helpButton = $('<button>')
      .appendTo(this.div)
      .addClass('btn-help')
      .text('?')
      .click(async () => {
        await Swal.fire({
            title: 'Instructions',
            html: this.help,
            icon: 'info',
            confirmButtonText: 'Got it!',
          })
      })
    }
    // this.prompt = $('<div>').css({
    //   'max-width': 700,
    //   'height': 120,
    //   'margin': 'auto',
    // }).appendTo(this.div)
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


class CycleViewer {
  constructor(div, items, onShow) {
    this.items = items
    this.onShow = onShow.bind(this)

    this.div = $('<div>').css({
      'position': 'relative',
      'margin': 'auto',
      'width': '1200px',
      'text-align': 'center',
    }).appendTo(div)


    this.top = $("<div>")
    .css('margin-bottom', 20)
    .appendTo(this.div)


    this.btnPrev = $('<button>')
    .addClass('btn')
    .text('<<')
    .css({
      display: 'inline-block',
    })
    .appendTo(this.top)

    this.title = $('<h2>').css({
      'margin-left': 30,
      'margin-right': 30,
      'display': 'inline-block',
      'min-width': 200
    }).appendTo(this.top)

    this.btnNext = $('<button>')
    .addClass('btn')
    .text('>>')
    .css({
      display: 'inline-block',
    })
    .appendTo(this.top)

    this.content = $('<div>').css({
      'width': '1200px',
      // border: 'thick black solid'
    }).appendTo(this.div)
    this.listener = new EventListeners()
  }

  setTitle(txt) {
    this.title.text(txt)
  }

  showItem(i) {
    this.onShow(this.items[i])
    this.btnPrev.unbind('click')
    this.btnPrev.click(() => {
      this.showItem(mod(i - 1, this.items.length))
    })
    this.btnNext.unbind('click')
    this.btnNext.click(() => {
      this.showItem(mod(i + 1, this.items.length))
    })
    this.listener.on('keydown', event => {
      if (event.key === "ArrowLeft") {
        this.listener.clear()
        this.showItem(mod(i - 1, this.items.length))
      }
      else if (event.key === "ArrowRight") {
        this.listener.clear()
        this.showItem(mod(i + 1, this.items.length))
      }
    })
  }
}