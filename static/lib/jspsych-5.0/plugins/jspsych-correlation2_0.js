jsPsych.plugins["correlation2.0"] = (function() {

  var plugin = {};

  plugin.trial = function(display_element, trial) {
    // if any trial variables are functions
    // this evaluates the function and replaces
    // it with the output of the function
    trial = jsPsych.pluginAPI.evaluateFunctionParameters(trial);

    // Example
    // timeline = [
    //   {name: 'John', member: 'Group A', description: 'cuts line'},
    //   {name: 'Jake', member: 'Group B', description: 'visits sick friends'},
    // ]
    $(display_element).html('')
    $('<div>', {id: 'corr-name'}).html(trial.name).appendTo(display_element)
    $('<div>', {id: 'corr-member'}).html(trial.member).appendTo(display_element)
    $('<div>', {id: 'corr-des'}).html(trial.description).appendTo(display_element)
    
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
      stimulus: [trial.name, trial.member, trial.description],
      key_press: info.key
        }
        jsPsych.finishTrial(trialdata);
      };

      jsPsych.pluginAPI.getKeyboardResponse({
        callback_function: after_response,
        valid_responses: [],
        rt_method: 'date',
        persist: false,
        allow_held_key: false
      });

    };

    return plugin;
  })();