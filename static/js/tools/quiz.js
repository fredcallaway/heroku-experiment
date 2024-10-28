function parseQuizText(text) {
  const lines = text.trim().split("\n")
  const questions = []
  let currentQuestion = null

  for (const line of lines) {
    const trimmedLine = line.trim()
    if (trimmedLine.startsWith("#")) {
      if (currentQuestion) {
        questions.push(currentQuestion)
      }
      currentQuestion = [trimmedLine.slice(1).trim(), [], null]
    } else if (trimmedLine.startsWith("-") || trimmedLine.startsWith("*")) {
      const option = trimmedLine.slice(1).trim()
      currentQuestion[1].push(option)
      if (trimmedLine.startsWith("*")) {
        currentQuestion[2] = option
      }
    }
  }

  if (currentQuestion) {
    questions.push(currentQuestion)
  }

  return questions
}

class Quiz extends Component {
  constructor(questions) {
    super({})
    if (typeof questions == "string") {
      questions = parseQuizText(questions)
    }
    this.div.css({
      textAlign: "left",
      // border: "1px solid black",
    })
    this.questions = questions
    // Ensure all questions have a correct answer
    this.questions.forEach((q) => {
      if (!q[2]) {
        throw new Error("Quiz question has no correct answer: " + q[0])
      }
    })
    this.correct = []
    this.inputs = questions.map((q) => {
      this.correct.push(q[2])
      return radio_buttons(this.div, q[0], q[1])
    })
    this.button = button(this.div, "check answers", {persistent: true})
  }

  async _run() {
    // not sure why we need to rebind this
    while (true) {
      await clickPromise(this.button)
      if (await this.check()) {
        return
      }
    }
  }

  async check() {
    let answers = this.inputs.map((i) => i.val())
    this.recordEvent("check", { answers, correct: this.correct })
    let pass = _.every(_.zip(answers, this.correct), ([a, c]) => {
      return a == c
    })
    if (pass) {
      await alert_success()
      return true
    } else {
      await alert_failure({
        title: "Try again",
        html: "Click the arrows at the top of the screen to review the instructions if needed.",
      })
      return false
    }
  }
}
