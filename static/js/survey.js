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
    this.survey = new Survey.Model(EXAMPLE_SURVEY);
    this.results = make_promise()
    this.survey.onComplete.add((sender) => this.results.resolve(sender.data));

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


  attach(element) {
    this.el = $(element)
    this.el.empty()
    $('<div>', {id: '_survey_target'}).appendTo(this.el)
    this.survey.render('_survey_target');
  }
}