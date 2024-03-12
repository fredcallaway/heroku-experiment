ERROR_EMAIL = 'youremail@bodacious.edu'
// this defines 6 conditions (a 2x3 design)
// make sure to update num_conds in config.txt to reflect any changes you make here
const PARAMS = conditionParameters(CONDITION, {
  showSecretStage: [false, true],
  anotherParameter: [1, 2, 3],
})

updateExisting(PARAMS, urlParams) // allow hardcoding e.g. &showSecretStage=true
psiturk.recordUnstructuredData('params', PARAMS);


async function runExperiment() {
  // stimuli = await $.getJSON(`static/json/${CONDITION}.json`)

  // logEvent is how you save data to the database
  logEvent('experiment.initialize', {CONDITION, PARAMS})
  enforceScreenSize(1200, 750)

  async function instructions() {
    await new ExampleInstructions().run(DISPLAY)
  }

  async function main() {
    DISPLAY.empty()
    let trials = [1,2,3]
    let top = new TopBar({
      nTrial: trials.length,
      height: 70,
      width: 900,
      help: `
        Write some help text here.
      `
    }).prependTo(DISPLAY)

    let workspace = $('<div>').appendTo(DISPLAY)

    for (let trial of trials) {
      // you will probably want to define a more interesting task here
      // or in a separate file (make sure to include it in exp.html)
      workspace.empty()
      await button(workspace, 'click me')
      .css({marginTop: 150, marginLeft: -400 + 200 * trial})
      .promise()
      top.incrementCounter()
      saveData()

    }
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

    makeGlobal({difficulty})

    await button(div, 'submit').clicked
    // this information is already in the log, but let's put it in one place
    logEvent('debrief.submitted', getInputValues({difficulty, feedback}))
  }

  // using runTimeline is optional, but it allows you to jump to different blocks
  // with url parameters, e.g. http://localhost:8000/?block=main
  await runTimeline(
    instructions,
    main,
    debrief
  )
};
