
async function initializeExperiment() {
  console.log('initializeExperiment');
  console.log('data');

	BONUS = 0
	BONUS_RATE = 0.01
  
  jsPsych.pluginAPI.preloadImages(['static/images/robot_land/population.png', 'static/images/robot_land/yellow.png','static/images/robot_land/blue.png']);
	
	var instruction = {
		type: "instructions",
		pages: [
			'Welcome to the experiment. Click next to begin.',
			'You are going to observe two groups of robots. One group comes from Boxby Land. The other group comes from Daxby Land. For this experiment, we try to draw a random sample from the robot population. In the robot world, Boxby Land is less populated, and as such, robots from Boxby Land occur less frequently in the pictures you will see.'
		],
		show_clickable_nav: true
	}


	var introduction = {
		type: 'single-stim',
		stimulus: "static/images/robot_land/population.png",
		choices: ["y", "n"],
		prompt: '<p class="center-content">Press y when you are ready.</p>'
	};


	/* load JSON file */
	var stimuli = (function() {
		var json = null;
		$.ajax({
			'async': false,
			'global': false,
			'url': "static/condition_stimuli.json",
			'dataType': "json",
			'success': function (data) {
				json = data;
			}
		});
		return json;
	})();


	var secondary_task_q = ['Please type in the number'];
	var secondary_task = {
		type: 'survey-text-force',
		preamble: function() {
			var digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
			var digit_task = jsPsych.randomization.sample(digits, 7, true).join("");
			var number = "<p style= 'color: blue; font-size: 48px;'>" + digit_task + "</p>";
			return number + "<p>Memorize the digits shown above. We will ask you to recall these digits at the end of the experiment. Please don't write them down. Press the space key to continue.</p>"
		},
		questions: secondary_task_q,
		is_html: true,
		required: [true]
	};
//
// 	var bonus_instruction = {
// 		type: "instructions",
// 		pages: [
// 			`<p>For the following tasks, you will be asked to make some predictions.</p>
// 			<p>You will receive a bonus of <strong> 1 cent </strong> for each correct prediction`
// 		],
// 		show_clickable_nav: true
// 	}
//
	var test = {
		type: 'robot',
		timeline: stimuli,
		prompt: `<p class="center-content">
			Where is this robot from?<br>
			Press <b>D</b> for Daxby Land or <b>B</b> for Boxby Land.
			</p>`,
		choices: ['b', 'd'],
		randomize_order: true
	};
//
// 	var recall_q = ["Please write down the digits shown to you at the beginning of the experiment."]
//
// 	var recall = {
// 		type: 'survey-text',
// 		questions: recall_q
// 	}
//
//
// 	var questions_boxby = ["<p>How many times has a robot with a <strong style = 'color: orange; font-weight: bold;'>yellow</strong> body appeared?</p> ", "<p>How many times has a robot with a  <strong style = 'color: blue; font-weight: bold;'> blue </strong> body appeared?</p>"]
// 	var questions_daxby = ["<p>How many times has a robot with a <strong style = 'color: orange; font-weight: bold;'>yellow</strong> body appeared?</p>", "<p>How many times has a robot with a <strong style = 'color: blue; font-weight: bold;'> blue </strong> body appeared?</p>"]
// 	var questions = ["<p>Out of 100 robots from Daxby Land, how many have a <strong style = 'color: orange; font-weight: bold;'>yellow</strong> body?</p>", "<p>Out of 100 robots from Boxby Land, how many have a <strong style = 'color: orange; font-weight: bold;'>yellow</strong> body?</p>"]
//
// 	var question_boxby={
// 		type: 'survey-text-force',
// 		preamble: ['<p style= "text-align: left; font-size: 50px;">For robots from <strong style = "font-size: 48px;">Boxby Land</strong></p>'],
// 		questions: questions_boxby,
// 		required: [true, true]
// 	}
//
// 	var question_daxby={
// 		type: 'survey-text-force',
// 		preamble: ['<p style= "text-align: left; font-size: 50px;">For robots from <strong style = "font-size: 48px;">Daxby Land</strong></p>'],
// 		questions: questions_daxby,
// 		required: [true, true]
// 	}
//
// 	var questions={
// 		type: 'survey-text-force',
// 		questions: questions,
// 		required: [true, true]
// 	}
//
// 	var goodbye = {
// 		type: "instructions",
// 		pages: ['<p>Thanks so much for participating in this research.</p>' + `Your final bonus is $${BONUS.toFixed(2)}`],
// 		show_clickable_nav: true
// 	}


  /////////////////////////
  // Experiment timeline //
  /////////////////////////

	var condition = 1
	var timeline = []

	// if (condition == 1){
	// 	timeline.push(instruction, animation_trial, secondary_task, bonus_instruction, test, recall, question_boxby, question_daxby, questions, goodbye);
	// } else {
	// 	timeline.push(instruction, animation_trial, bonus_instruction, test, question_boxby, question_daxby, questions, goodbye);
	// }
	var timeline = [instruction, introduction, secondary_task, test]

  return startExperiment({
    timeline,
  });
};


