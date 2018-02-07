# coffeelint: disable=max_line_length, indentation

initializeExperiment = ->
  LOG_DEBUG 'initializeExperiment'
  trials = await $.getJSON 'static/json/rewards/increasing.json'

  survey =
    type: 'survey-text'
    questions: [
      {prompt: "How old are you?"}
      {prompt: "Where were you born?"}
    ]
  
  startExperiment
    exclusions:
      min_width: 800
      min_height: 600
    timeline: if DEBUG then [
      # DEBUGGING TIMELINE
      survey
    
    ] else [
      # NORMAL TIMELINE
      survey
    ]

