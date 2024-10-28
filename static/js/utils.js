function deferredPromise(promise) {
  let resolve, reject
  const deferred = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  deferred.resolve = resolve
  deferred.reject = reject

  if (promise) {
    if (typeof promise == "function") {
      promise = new Promise(promise)
    } else if (typeof promise.then !== "function") {
      throw new Error(`deferredPromise requires a promise argument, got ${JSON.stringify(promise)}`)
    }
    promise.then(deferred.resolve, deferred.reject)
  }
  return deferred
}

function clickPromise(el) {
  return deferredPromise((resolve) => el.on("click", resolve))
}

function sleep(ms, name = "sleep") {
  let d = deferredPromise()
  setTimeout(() => d.resolve(name), ms)
  return d
}

function randomUUID() {
  return Date.now() + Math.random().toString(36).substring(2)
}

const _uniqueID = new Map()
function makeUniqueID(prefix, { alwaysPostfix = false } = {}) {
  if (!_uniqueID.has(prefix)) {
    _uniqueID.set(prefix, 0)
    return alwaysPostfix ? `${prefix}-1` : prefix
  }
  let id = _uniqueID.get(prefix)
  _uniqueID.set(prefix, id + 1)
  return `${prefix}-${id + 1}`
}

function uniformRandom(min, max) {
  return min + Math.random() * (max - min)
}

function numString(n, noun, options = {}) {
  if (n > 10) {
    return `${n} ${noun}s`
  }
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

function hex2rgb(hex) {
  // Convert hex color to rgb
  let r = parseInt(hex.slice(1, 3), 16)
  let g = parseInt(hex.slice(3, 5), 16)
  let b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

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


function markdown(txt) {
  if (typeof showdown === "undefined") {
    console.log("Warning: showdown not loaded, returning plain text.")
    return txt
  }
  // Remove leading spaces so as not to interpret indented
  // blocks as code blocks. Use fenced code blocks instead.
  return new showdown.Converter().makeHtml(txt.replace(/^[ ]+/gm, ""))
}

function checkDefined(name, val) {
  if (val === void 0) {
    throw new Error(`${name} is undefined`)
  }
  return val
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


function assert(val, msg = "(no details)") {
  if (!val) {
    throw new Error("Assertion Error: " + msg)
  }
  return val
}

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
      `points_per_cent must be a number, but is ${JSON.stringify(
        points_per_cent
      )}`
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
    DATA.recordEvent("bonus.addPoints", { points, total: this.points })
    DATA.setKeyValue("bonus", this.dollars(), true) // this can be doled out automatically with bin/prolific.py
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

