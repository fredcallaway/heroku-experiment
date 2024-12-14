

class ExampleInstructions extends Instructions {
  constructor(options = {}) {
    // super() sets up the general instructions interface
    // note that for all components, options are automatically assigned to instance variables
    // you can disable this with autoAssignOptions: false
    super({
      eventPrefix: "instructions",
      promptHeight: 150,
      promptWidth: 600,
      contentWidth: 800,
      showSecretStage: false,
      ...options,
    })

    if (!this.showSecretStage) {
      this.stages = this.stages.filter((stage) => {
        return stage.name != "stage_conditional"
      })
    }
    window.instruct = this // lets you access the instructions object from the console (for debugging only!)
  }

  // the stages run in the order that they're defined
  // you can jump to a specific stage using it's position e.g. http://127.0.0.1:8000/?instruct=2
  // or by name e.g. http://127.0.0.1:8000/?instruct=stage2

  async stage_welcome() {
    this.setPrompt(`
      Thanks for trying out the template! These instructions will give you a sense
      of what the template makes easy to do. Make sure you look at the source code
      later! This file is static/js/instructions.js.

      _use the arrows above to navigate_
    `)
  }

  async stage_conditional() {
    this.setPrompt("You will only see this if `PARAMS.showSecretStage` is true")
  }

  async stage_buttons() {
    this.setPrompt(`
      You can make a button.
    `)
    await button(this.prompt, "Click me").promise()
  }

  async stage_buttonarray() {
    let choice = await button_array(this.prompt, 
      "You can make multiple buttons at once.", 
      ["left", "right"]
    ).promise()
    console.log('CHOICE', choice)
    
    this.prompt.html(
      `You really should have clicked ${choice === "left" ? "right" : "left"}.`
    )
    await this.continue("I'm sorry")  // convenience method to make a button
    this.runNext()
  }

  async stage_slider() {
    this.setPrompt(`
      We've got sliders.
    `)
    await slider(this.prompt, "how slider?", {
      leftLabel: "not at all slider",
      rightLabel: "extremely slider",
    }).promise("change")
  }
    
  async stage_radio() {
    const radio = radio_buttons(this.prompt, 
      "Radio buttons for days!", 
      ["so", "many", "buttons"]
    )
    
    await radio.promise()
    // inputSelector() is a jquery selector so you can use any jquery magic you want here
    radio.inputSelector().prop("disabled", true)

    await radio_buttons(this.prompt, 
      "this is a Likert scale", 
      ["strongly disagree", "disagree", "neutral", "agree", "strongly agree"],
      {name: 'likert'}
    ).promise()

    await this.continue()
  }

  async stage_logging() {
    this.setPrompt("By the way, we've been watching you.")
    // await sleep(2000)
    await this.continue("uhh...")

    // FYI: it's much easier to do this the "regular" way with Date.now()
    let e1 = DATA.events.findLast(e => {
      return e.event.endsWith('display')
    })
    let e2 = DATA.events.findLast(e => {
      return e.event.endsWith('click')
    })
    let rt = e2.timestamp - e1.timestamp

    this.setPrompt(`
      We've been logging _everything you do._ You clicked that last
      button ${rt}ms after it appeared.
    `)
    await this.continue("i see")
    this.setPrompt(`
      You can see the data, right there in the developer console.
      It will also be saved in data/events.csv. Here it is:
    `)
    this.content.html(
      `<pre>${JSON.stringify(DATA.events, null, 2)}</pre>`
    )
    await this.continue("creepy")
  }
    
  async stage_alerts() {
    this.preventAutoContinue()
    this.setPrompt("Sometimes there will be fun alerts!")
    let div = $("<div>")
      .css({
        display: "flex",
        justifyContent: "space-between",
        width: 300,
        margin: "auto",
      })
      .appendTo(this.content)
    
    for (const type of ["success", "info", "warning", "failure"]) {
      const className = `btn btn-${type === "failure" ? "danger" : type}`
      console.log(type, className)
      button(div, type, {persistent: true, className}).on("click", () => ALERTS[type]())
    }
    
  }

  async stage_task() {
    this.setPrompt(`
      You can embed the task into the instructions. This is usually a good way
      to introduce the task to participants.
    `)
    let task = new ExampleTask({ nRound: 3, id: "introduce_task", timeout: 10000})
    task.attach(this.content)

    await this.continue()
    this.setPrompt("When you see a black circle, click on it as quickly as you can.")
    while (true) {
      task.setTarget()
      let result = await task.getClick()
      if (result == "hit") {
        break
      } else {
        await this.sleep(1000)
        this.setPrompt("Try again. Click on the black circle.")
      }
    }
    this.setPrompt("Good job!")
    await this.continue()
    this.runNext() // don't make them click the arrow
  }

  async stage_hard() {
    this.setPrompt("Try it again!")
    // This is an example of using the event dispatcher (EVENTS)
    // You can do this for any event that is triggered by DATA.recordEvent
    // You can also get a promise that resolves when an event occurs 
    // with this.eventPromise() or EVENTS.promise()
    this.onEvent("task.hit", () => {
      this.prompt.append(" Nice! ")
    })
    this.onEvent("task.miss", () => {
      this.prompt.append(" So close! ")
    })
    this.onEvent("task.timeout", () => {
      this.prompt.append(" Too slow! ")
    })
    let task = new ExampleTask({
      nRound: 8,
      timeout: 1000,
      targetSize: 10,
      id: "hard",
    })
    // it's critical to use registerPromise here to make sure that the component
    // is properly cancelled if the user navigates away from the stage
    await this.registerPromise(task.run(this.content))
  }

  async stage_quiz() {
    this.setPrompt(`
      You can also embed quizzes into the instructions.
    `)
    // we assign the quiz to a property so that the state is preserved 
    // when the user navigates between stages (to check for answers)
    this.quiz = this.quiz ?? new Quiz(`
      # What is the airspeed velocity of an unladen swallow?
      - 20.1 miles per hour
      * An African or European swallow?
    `)
    
    await this.registerPromise(this.quiz.run(this.prompt))
    this.runNext()
  }

  async stage_final() {
    // I suggest keeping something like this here to warn participants to not refresh

    this.setPrompt(`
      In the rest of the experiment, yada yada...

      You will also earn points for each task you complete.
      ${BONUS.describeScheme()}

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
    let no = deferredPromise()
    radio.on("click", () => {
      if (radio.val() == "yes") {
        post.html("Haha... But seriously.")
      } else {
        no.resolve()
      }
    })
    await no
    radio.inputSelector().off()
    radio.inputSelector().prop("disabled", true)
    post.html("Good. No refreshing!")
    await this.continue("finish instructions")
    this.runNext() // don't make them click the arrow
  }
}
