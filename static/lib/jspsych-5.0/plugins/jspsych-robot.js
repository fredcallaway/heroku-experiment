delay = function(time, func) {
  return setTimeout(func, time);
};


jsPsych.plugins["robot"] = (function() {

  var plugin = {};

  plugin.trial = function(display_element, trial) {
    // if any trial variables are functions
    // this evaluates the function and replaces
    // it with the output of the function
    trial = jsPsych.pluginAPI.evaluateFunctionParameters(trial);

    // Example
    // timeline = [
    //   {'color': 'blue', 'group': 'daxby'},
    //   {'color': 'blue', 'group': 'boxby'},
    //   {'color': 'red', 'group': 'boxby'},

    console.log('ROBOT TRIAL')
    html = `<img class='display robot' src='static/images/robot_land/${trial.color}.png'>`;
    console.log(html)
    $('<div>', {id: 'stage'}).html(html).appendTo(display_element);
    var $feedback = $('<div>', {id: 'feedback'}).appendTo(display_element);
    
    trial.prompt = trial.prompt || "";
    var $prompt = $('<div>').appendTo(display_element)
    $prompt.html(trial.prompt)

    var after_response = function(info) {
      console.log(info)
      // display_element.html(''); // clear the display
      var correct_response = trial.group[0].toLowerCase();
      var response = String.fromCharCode(info.key).toLowerCase();
      console.log('response', response, correct_response)
      var correct = response == correct_response;
      if (correct) {
        BONUS += BONUS_RATE
      }
	  

      var capitalize = function(string) {
        return string.charAt(0).toUpperCase() + string.substring(1).toLowerCase();
      }

      $prompt.html("")
      $feedback.html(`
        ${correct ? 
          "<strong style='color: green'>Correct!</strong>" :
          "<strong style='color: red'>Incorrect!</strong>"}
        <br>

        This robot is from ${capitalize(trial.group)} Land.
        
		<br>
		Your current bonus is $${BONUS.toFixed(2)}

      `)

      var trialdata = {
        rt: info.rt,
        response: response,
        color: trial.color,
        group: trial.group,
        correct: correct
      }
      delay(4000, function() {
        console.log(trialdata)
        display_element.html('')
        jsPsych.finishTrial(trialdata);
      });
    };

    jsPsych.pluginAPI.getKeyboardResponse({
      callback_function: after_response,
      valid_responses: ['d', 'b'],
      rt_method: 'date',
      persist: false,
      allow_held_key: false
    });

  };

  return plugin;
})();
