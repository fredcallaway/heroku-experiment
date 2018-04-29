jsPsych.plugins["correlation"] = (function() {

  var plugin = {};

  plugin.trial = function(display_element, trial) {
    // if any trial variables are functions
    // this evaluates the function and replaces
    // it with the output of the function
    trial = jsPsych.pluginAPI.evaluateFunctionParameters(trial);

    // Example
    // timeline = [
    //   {flips: 'HTHHT', roll: '4'},
    //   {flips: 'HTTTT', roll: '1'},
    // ]

    $('<div>', {id: 'corr-left'}).html(trial.flips).appendTo(display_element)
    $('<div>', {id: 'corr-right'}).html(trial.roll).appendTo(display_element)
    
	trial.prompt = trial.prompt || "";
    //show prompt if there is one
    if (trial.prompt !== "") {
      display_element.append(trial.prompt);
    }
	// var sti_record = [];
    var after_response = function(info) {
      display_element.html(''); // clear the display
      var trialdata = {
        rt: info.rt,
		stimulus: [trial.flips, trial.roll],
		key_press: info.key
      }
      jsPsych.finishTrial(trialdata);
    };

    jsPsych.pluginAPI.getKeyboardResponse({
      callback_function: after_response,
      valid_responses: ['y', 'n'],
      rt_method: 'date',
      persist: false,
      allow_held_key: false
    });

  };

  return plugin;
})();
