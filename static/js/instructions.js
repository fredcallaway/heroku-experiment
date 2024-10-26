

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
