jsPsych.plugins["survey-text-force"] = (function() {
  console.log("load please")
  var plugin = {};
  
  plugin.trial = function(display_element, trial) {
    var plugin_id_name = "survey-text-force";
    var plugin_id_selector = '#' + plugin_id_name;
    var _join = function( /*args*/ ) {
      var arr = Array.prototype.slice.call(arguments, _join.length);
      return arr.join(separator = '-');
    };

    // trial defaults
    trial.preamble = typeof trial.preamble == 'undefined' ? "" : trial.preamble;
    trial.required = typeof trial.required == 'undefined' ? null : trial.required;
    
	//////////////////////////////////////////
    
	if (typeof trial.rows == 'undefined') {
      trial.rows = [];
      for (var i = 0; i < trial.questions.length; i++) {
        trial.rows.push(trial.rows.default);
      }
    }
    if (typeof trial.columns == 'undefined') {
      trial.columns = [];
      for (var i = 0; i < trial.questions.length; i++) {
        trial.columns.push(trial.columns.default);
      }
    }
	/////////////////////////////////////////////////////////////

    // if any trial variables are functions
    // this evaluates the function and replaces
    // it with the output of the function
    trial = jsPsych.pluginAPI.evaluateFunctionParameters(trial);
	
	//////////////////////////////////////////////////

    // form element
    var trial_form_id = _join(plugin_id_name, "form");
    display_element.append($('<form>', {
      "id": trial_form_id
    }));
    var $trial_form = $("#" + trial_form_id);
///////////////////////////////////////
    // show preamble text
    var preamble_id_name = _join(plugin_id_name, 'preamble');
    $trial_form.append($('<div>', {
      "id": preamble_id_name,
      "class": preamble_id_name
    }));
    $('#' + preamble_id_name).html(trial.preamble);
	///////////////////////////////////////////

    // add text response questions
    for (var i = 0; i < trial.questions.length; i++) {

      // create question container
      var question_classes = [_join(plugin_id_name, 'question')];
      $trial_form.append($('<div>', {
        "id": _join(plugin_id_name, i),
        "class": question_classes.join(' ')
      }));

      var question_selector = _join(plugin_id_selector, i);

      // add question text
      $(question_selector).append(
        '<p class="' + plugin_id_name + '-text survey-text-force">' + trial.questions[i] + '</p>'
      );
	  

      // add text box
      //$("#jspsych-survey-text-" + i).append('<textarea name="#jspsych-survey-text-response-' + i + '" cols="' + trial.columns[i] + '" rows="' + trial.rows[i] + '"></textarea>');
    
	  
      
      // text input area name
      var resp_box_name = _join(plugin_id_name, "resp-box", i);
      var resp_box_selector = '#' + resp_box_name;

      // add text input/area container
      $(question_selector).append($('<div>', {
        "id": resp_box_name,
        "class": _join(plugin_id_name, 'option')
      }));

      // set up the text input/area
      var question_container = document.getElementById(resp_box_name);
      var input_name = _join(plugin_id_name, 'response', i); // name and ID are the same
	  var input; 

	        if(trial.rows[i] == 1){
	          // input[type=text]
	          input = document.createElement('input');
	          input.setAttribute('type', "text");
	          input.setAttribute('size', trial.columns[i]);
	        } else {
	          // textarea
	          input = document.createElement('textarea');
	          input.setAttribute('rows', trial.rows[i]);
	          input.setAttribute('cols', trial.columns[i]);
	        }
	        // add autofocus
	        if (i === 0) {
	          input.setAttribute('autofocus', true);
	        }

	        question_container.appendChild(input);

	  

    		if (trial.required && trial.required[i]) {
      		  // add required property
      		  $(question_selector + " textarea").prop("required", true);
    	  	}
  }



  // add submit button
  $trial_form.append($('<input>', {
    'type': 'submit',
    'id': plugin_id_name + '-next',
    'class': plugin_id_name + ' jspsych-btn',
    'value': 'Submit Answers'
  }));

  $trial_form.submit(function(event) {

      event.preventDefault();
      
      // measure response time
      var endTime = (new Date()).getTime();
      var response_time = endTime - startTime;

      // create object to hold responses
      var question_data = {};
      $("div." + plugin_id_name + "-question").each(function(index) {
        var id = "Q" + index;
        var val = $(this).find('textarea, input').val();
        var obje = {};
        obje[id] = val;
        $.extend(question_data, obje);
      });
	  
      
      // save data
      var trial_data = {
        "rt": response_time,
        "responses": JSON.stringify(question_data)
      };
      display_element.html('');

      // next trial
      jsPsych.finishTrial(trial_data);

    });

    var startTime = (new Date()).getTime();

  }) ();

  return plugin;
})();