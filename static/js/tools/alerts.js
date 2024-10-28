class Alerts {
  constructor() {
    this.swal = Swal.mixin({
      allowOutsideClick: false,
    })
  }

  basic(options = {}) {
    return this.swal.fire({
      allowOutsideClick: false,
      ...options,
    })
  }

  info(options = {}) {
    return this.basic({
      title: "Hint",
      icon: "info",
      html: "This should have been a hint, but I forgot to write it.",
      confirmButtonText: "Got it!",
      ...options,
    })
  }

  warning(options = {}) {
    return this.basic({
      title: "Hold up!",
      html: "This should have been a warning, but I forgot to write it.",
      icon: "warning",
      confirmButtonText: "Got it!",
      ...options,
    })
  }

  success(options = {}) {
    const flavor = _.sample([
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
    return this.basic({
      title: "Success!",
      html: `<em>${flavor}!</em>`,
      icon: "success",
      confirmButtonText: "Continue",
      ...options,
    })
  }

  failure(options = {}) {
    const flavor = _.sample([
      "better luck next time",
      "shake it off and try again",
      "failure is the spice that gives success its flavor",
      "just a little detour on the road to greatness",
      "everyone likes an underdog, get back in there",
    ])
    return this.basic({
      title: "Not quite",
      html: `<em>${flavor}!</em>`,
      icon: "error",
      confirmButtonText: "Continue",
      ...options,
    })
  }
}

// Wrapper functions
const ALERTS = new Alerts()

function alert_info(options = {}) {
  return ALERTS.info(options)
}

function alert_warning(options = {}) {
  return ALERTS.warning(options)
}

function alert_success(options = {}) {
  return ALERTS.success(options)
}

function alert_failure(options = {}) {
  return ALERTS.failure(options)
}
