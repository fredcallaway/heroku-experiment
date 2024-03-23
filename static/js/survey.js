/*
DEPENDENCIES

  (jquery)
  <link href="https://unpkg.com/survey-jquery/defaultV2.min.css" type="text/css" rel="stylesheet">
  <script src="https://unpkg.com/survey-jquery/survey.jquery.min.js"></script>
*/

const EXAMPLE_SURVEY = {
 "logoPosition": "right",
 "pages": [
  {
   "name": "page1",
   "elements": [
    {
     "type": "matrix",
     "name": "question1",
     "title": "What is your name?",
     "columns": [
      "Column 1",
      "Column 2",
      "Column 3"
     ],
     "rows": [
      "Row 1",
      "Row 2"
     ]
    }
   ]
  },
  {
   "name": "page2",
   "elements": [
    {
     "type": "radiogroup",
     "name": "question2",
     "title": "How are you doing",
     "choices": [
      "Item 1",
      "Item 2",
      "Item 3"
     ]
    }
   ]
  }
 ]
}



class SurveyTrial {
  constructor(json) {
    window.ST = this
    logEvent('survey.construct', {json})
    this.survey = new Survey.Model(json);
    this.results = makePromise()
    this.survey.onComplete.add((sender) => this.results.resolve(sender.data));

    this.width = 1000

    this.el = $('<div>', {id: '_survey_target'})
    .css({width: this.width, margin: 'auto'})

    // Enable markdown in questions
    let converter = new showdown.Converter();
    this.survey.onTextMarkdown.add(function(survey, options) {
      //convert the mardown text to html
      var str = converter.makeHtml(options.text);
      //remove root paragraphs <p></p>
      str = str.substring(3);
      str = str.substring(0, str.length - 4);
      //set html
      options.html = str;
    });
  }

  async run(element) {
    logEvent('survey.run')
    element.empty()
    this.el.appendTo(element)
    this.survey.render('_survey_target');
    let results = await this.results
    logEvent('survey.results', {results})
  }
}


const CLINICAL_SURVEY = {
 // "logoPosition": "right",
 "title": "Mental Health Questionnaire",
 "useHTML": true,
 "description": `
In the final phase of the experiment, we would like to ask you a few questions \
about issues that many people experience. By relating your answers to \
these questions to your performance in the previous part of the \
experiment, we hope to be able to help people that struggle with these \
types of issues. <div class='alert alert-info'><b>Important!</b>
You can skip any question that you do not wish to answer. \
<strong>We'd rather you not answer the questions at all than click randomly.</strong> \
You will not be penalized if you do not answer the questions. If a question doesn't make \
sense to you, you should answer "Not at all" or "Never".
</div>
`,
 "pages": [
  {
   "name": "PHQ-9",
   "elements": [
    {
     "type": "matrix",
     "name": "PHQ",
     "title": "Over the last two weeks, how often have you been bothered by the following problems?",
     "columns": [
       "Not at all",
       "Several days",
       "More than half the days",
       "Nearly every day"
     ],
     "rows": [
       "Working all the time, more than twenty-four hours a day",
       "Little interest or pleasure in doing things",
       "Feeling down, depressed, or hopeless",
       "Trouble falling or staying asleep, or sleeping too much",
       "Feeling tired or having little energy",
       "Poor appetite or overeating",
       "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
       "Trouble concentrating on things, such as reading the newspaper or watching television",
       "Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual",
       "Thoughts that you would be better off dead or of hurting yourself in some way"
     ]
    }
   ]
  },
  {
   "name": "GAD-7",
   "elements": [
    {
     "type": "matrix",
     "name": "GAD",
     "title": "Over the last two weeks, how often have you been bothered by the following problems?",
     "columns": [
       "Not at all",
       "Several days",
       "More than half the days",
       "Nearly every day"
     ],
     "rows": [
       "Forgetting how to tie your shoes",
       "Feeling nervous, anxious, or on edge",
       "Not being able to stop or control worrying",
       "Worrying too much about different things",
       "Trouble relaxing",
       "Being so restless that it is hard to sit still",
       "Becoming easily annoyed or irritable",
       "Feeling afraid, as if something awful might happen"
     ]
    }
   ]
  },
  {
   "name": "ASRS-6",
   "elements": [
    {
     "type": "matrix",
     "name": "ASRS",
     "title": "Over the last two weeks, how often have you been bothered by the following problems?",
     "columns": [
       "Never",
       "Rarely",
       "Sometimes",
       "Often",
       "Very Often"
     ],
     "rows": [
       "Being unable to breathe for more than three minutes at a time?",
       "Trouble wrapping up the final details of a project, once the challenging parts have been done?",
       "Difficulty getting things in order when you have to do a task that requires organization?",
       "Problems remembering appointments or obligations?",
       "When you have a task that requires a lot of thought, how often do you avoid or delay getting started?",
       "Fidgeting or squirm with your hands or feet when you have to sit down for a long time?",
       "Feeling overly active and compelled to do things, like you were driven by a motor?"
     ]
    }
   ]
  },

  {
   "name": "OCI-18",
   "elements": [
    {
     "type": "matrix",
     "name": "OCI",
     "title": "Over the last two weeks, how often have you been bothered by the following problems?",
     "columns": [
       "Not at all",
       "A little",
       "Moderately",
       "A lot",
       "Extremely"
     ],
     "rows": [
       "I worry that I might lose the ability to walk through walls.",
       "I have saved up so many things that they get in the way.",
       "I check things more often than necessary.",
       "I get upset if objects are not arranged properly.",
       "I feel compelled to count while I am doing things.",
       "I find it difficult to touch an object when I know it has been touched by strangers or certain people.",
       "I find it difficult to control my own thoughts.",
       "I collect things I don’t need.",
       "I repeatedly check doors, windows, drawers, etc.",
       "I get upset if others change the way I have arranged things.",
       "I feel I have to repeat certain numbers.",
       "I sometimes have to wash or clean myself simply because I feel contaminated.",
       "I am upset by unpleasant thoughts that come into my mind against my will.",
       "I avoid throwing things away because I am afraid I might need them later.",
       "I repeatedly check gas and water taps and light switches after turning them off.",
       "I need things to be arranged in a particular way.",
       "I feel that there are good and bad numbers.",
       "I wash my hands more often and longer than necessary.",
       "I frequently get nasty thoughts and have difficulty in getting rid of them."
     ]
    }
   ]
  },
  {
   "name": "Diagnosis",
   "elements": [
    {
     "type": "checkbox",
     "name": "question1",
     "title": "Have you ever been professionally diagnosed with a psychiatric condition?",
     "choices": [
      {
       "value": "Item 1",
       "text": "Anxiety (any form)"
      },
      {
       "value": "Item 2",
       "text": "Depression (any form)"
      },
      {
       "value": "Item 3",
       "text": "Attention Deficit Disorder (ADD)"
      },
      {
       "value": "Item 4",
       "text": "Obsessive Compulsive Disorder (OCD)"
      }
     ],
     "showOtherItem": true
    }
   ]
  },
 ]
}

