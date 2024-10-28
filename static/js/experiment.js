
// ---------- MAKE SURE TO SET THESE!! ----------
// ERROR_EMAIL = 'youremail@bodacious.edu'
// PROLIFIC_CODE = '6A5FDC7A'


// this defines 6 conditions (a 2x3 design)
// make sure to update num_conds in config.txt to reflect any changes you make here
// CONDITION is set in setup.js based on the condition psiturk flag
const PARAMS = conditionParameters(CONDITION, {
  showSecretStage: [false, true],
  anotherParameter: [1, 2, 3],
  points_per_cent: 100,
})

// this allows passing condition params with URL parameters e.g. &showSecretStage=true
updateExisting(PARAMS, urlParams)

const BONUS = new Bonus({
  points_per_cent: PARAMS.points_per_cent,
  initial: 0,
})

// use DATA.setKeyValue to record high-level summary information
// it will be saved in data/{experiment_code_version}/participants.csv
// the "params" key is special, and will be flattened into separate columns
DATA.setKeyValue('params', PARAMS)
DATA.setKeyValue('very important key', 'critical value')

// This is the main function that runs after the setup finishes
async function runExperiment() {
  // You might want to define separate configurations for each condition
  // this could include parameters, stimuli, trial definitions etc.
  // const config = await $.getJSON(`static/json/${CONDITION}.json`)
  
  // use DATA.recordEvent to record everything that happens in the experiment that you
  // could conceivably want to know about later. When in doubt, record it!
  // the info will be saved in data/{experiment_code_version}/events/{participant_id}.json
  DATA.recordEvent('experiment.initialize', {CONDITION, PARAMS})
  // Note: If you choose to use the Component structure (as we do in this example template)
  // then you will use this.recordEvent() instead. See task.js for an example.
  
  // Make sure the participant's screen is big enough to display the full task interface
  enforceScreenSize(1200, 750)

  // I like to break down the experiment into blocks, each of which is an async function
  async function instructions() {
    await new ExampleInstructions(PARAMS).run(DISPLAY)
  }

  async function main() {
    DISPLAY.empty() // make sure the page is clear

    // Every time the task.hit event is recorded, add 10 points to the bonus
    // Note: all DATA.recordEvent calls trigger events, and you can assign handlers to any of them
    // You can also use EVENTS.once() to trigger an event once, or EVENTS.promise() to wait for an event to occur
    EVENTS.on("task.hit", (event, data) => {
      BONUS.addPoints(10)
    })

    let trials = [
      {timeout: 3000, targetSize: 20},
      {timeout: 2000, targetSize: 15},
      {timeout: 1000, targetSize: 10},
    ]
    // convenience class that handles a round number incrementer
    // optionally you can provide help text which will make a question button on the right
    let top = new StatusBar({
      nTrial: trials.length,
      height: 70,
      width: 900,
      showPoints: true,
      help: `
        Click on the black circles as quickly as you can.
      `
    }).prependTo(DISPLAY)

    let workspace = $('<div>').appendTo(DISPLAY)

    for (let trial of trials) {
      let outcome = await new ExampleTask(trial).run(workspace)
      console.log("outcome", outcome) // this is just to show you that you can get the outcome

      top.incrementCounter()
      DATA.save() // this sends the data to the database, optional (will increase server load)
    }
  }

  async function survey() {
    await new SurveyTrial(EXAMPLE_SURVEY).run(DISPLAY)
  }

  async function debrief() {
    DISPLAY.empty()
    let div = $('<div>').appendTo(DISPLAY).addClass('text')
    $('<p>').appendTo(div).html(markdown(`
      # You're done!

      Thanks for participating! We have a few quick questions before you go.
    `))

    let difficulty = radio_buttons(div, `
      How difficult was the experiment?
    `, ['too easy', 'just right', 'too hard'])

    let feedback = text_box(div, `
      Do you have any other feedback? (optional)
    `)

    await button(div, 'submit').promise()
    // this information is already in the log, but let's put it in one place
    DATA.recordEvent('debrief.submitted', getInputValues({difficulty, feedback}))
  }

  // using runTimeline is optional, but it allows you to jump to different blocks
  // with url parameters, e.g. http://localhost:8000/?block=main
  await runTimeline(
    instructions,
    main,
    survey,
    debrief
  )
};
