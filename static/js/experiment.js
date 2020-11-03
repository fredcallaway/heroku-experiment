
async function initializeExperiment() {
  LOG_DEBUG('initializeExperiment');

  ///////////
  // Setup //
  ///////////

  // trials = await $.getJSON 'static/json/rewards/increasing.json'
  const N_TRIAL = 4;

  // This ensures that images appear exactly when we tell them to.
  jsPsych.pluginAPI.preloadImages(['static/images/blue.png', 'static/images/orange.png']);

  // To avoid repeating ourselves,  we create a variable for a piece
  // of html that we use multiple times.
  var anykey = "<div class='lower message'>Press any key to continue.</div>";


  //////////////////
  // Instructions //
  //////////////////

  var welcome_block = {
    type: "html-keyboard-response",
    // We use the handy markdown function (defined in utils.js) to format our text.
    stimulus: markdown(`
    # My Sweet Experiment

    This is a reworked version of the go/no-go task constructed in a
    [tutorial](http://docs.jspsych.org/tutorials/rt-task/) 
    on the jsPsych website. Note that the code here is a little different
    than the original.

    Specifically, the code here is better. 😉

    ${anykey}
    `)
    // text: markdown(
    //   `# Welcome

    //   This is a reworked version of the go/no-go task constructed in a
    //   [tutorial](http://docs.jspsych.org/tutorials/rt-task/) 
    //   on the jsPsych website. Note that the code here is a little different
    //   than the original.

    //   Specifically, the code here is better 😉.

    //   ${anykey}
    // `)

  };

  var instructions_block = {
    type: "html-keyboard-response",
    // Sometimes we do need the additional control of html.
    // We can mix markdown with html, but you can't use markdown
    // inside an html element, which is why we use <b>html bold tags</b> 
    // instead of the prettier **markdown format**.
    stimulus: markdown(`
      # Instructions

      In this experiment, a circle will appear in the center 
      of the screen. If the circle is **blue**, 
      press the letter F on the keyboard as fast as you can.
      If the circle is **orange**, do not press 
      any key.
      
      <div class='center'>
        <div class='left center'>
          <img src='static/images/blue.png'></img>
          <p><b>Press the F key</b></p>
        </div>
        <div class='right center'>
          <img src='static/images/orange.png'></img>
          <p><b>Do not press a key</b></p>
        </div>
      </div>

      ${anykey}
    `),
    timing_post_trial: 2000
  };

  /////////////////
  // Test trials //
  /////////////////

  var sorting = {
    type: 'free-sort',
    stimuli: ["static/images/blue.png", "static/images/orange.png"]
  }

  var stimuli = [
    {
      stimulus: "static/images/blue.png",
      data: { response: 'go' }
    },
    {
      stimulus: "static/images/orange.png",
      data: { response: 'no-go' }
    }
  ];

  var trials = jsPsych.randomization.repeat(stimuli, Math.floor(N_TRIAL / 2));

  var fixation = {
    type: 'html-keyboard-response',
    stimulus: '<div style="margin-top: 90px; font-size:60px;">+</div>',
    choices: jsPsych.NO_KEYS,
    trial_duration() {
      return Math.floor(Math.random() * 1500) + 750
    },
  }

  var test_block = {
    type: "image-keyboard-response",
    choices: ['F'],
    trial_duration: 1500,
    timeline: _.flatten(trials.map(trial => [fixation, trial]))
  };

  function getAverageResponseTime() {

    var trials = jsPsych.data.getTrialsOfType('html-keyboard-response');

    var sum_rt = 0;
    var valid_trial_count = 0;
    for (var i = 0; i < trials.length; i++) {
      if (trials[i].response == 'go' && trials[i].rt > -1) {
        sum_rt += trials[i].rt;
        valid_trial_count++;
      }
    }
    return Math.floor(sum_rt / valid_trial_count);
  }

  var debrief_block = {
    type: "html-keyboard-response",
    // We don't want to
    stimulus() {
      return `
        Your average response time was ${getAverageResponseTime()}.
        Press any key to complete the experiment. Thanks!
      `
    }
  };


  /////////////////////////
  // Experiment timeline //
  /////////////////////////

  // `timeline` determines the high-level structure of the
  // experiment. When developing the experiment, you
  // can comment out blocks you aren't working on
  // so you don't have to click through them to test
  // the section you're working on.
  var timeline = [
    // welcome_block,
    // instructions_block,
    sorting,
    test_block,
    debrief_block,
  ];


  return startExperiment({
    timeline,
    exclusions: {
      min_width: 800,
      min_height: 600
    },
  });
};


