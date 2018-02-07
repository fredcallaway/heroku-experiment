# coffeelint: disable=max_line_length, indentation

DEBUG = yes
LOCAL = no


if DEBUG
  console.log """
  X X X X X X X X X X X X X X X X X
   X X X X X DEBUG  MODE X X X X X
  X X X X X X X X X X X X X X X X X
  """
  CONDITION = 0

else
  console.log """
  # =============================== #
  # ========= NORMAL MODE ========= #
  # =============================== #
  """
  console.log '16/01/18 12:38:03 PM'
  CONDITION = parseInt condition

if mode is "{{ mode }}"
  LOCAL = true
  CONDITION = 0


PARAMS = undefined
TRIALS = undefined
STRUCTURE = undefined
SCORE = 0
calculateBonus = undefined


psiturk = new PsiTurk uniqueId, adServerLoc, mode
saveData = ->
  new Promise (resolve, reject) ->
    timeout = delay 10000, ->
      reject('timeout')

    psiturk.saveData
      error: ->
        clearTimeout timeout
        console.log 'Error saving data!'
        reject('error')
      success: ->
        clearTimeout timeout
        console.log 'Data saved to psiturk server.'
        resolve()


# $(window).resize -> checkWindowSize 800, 600, $('#jspsych-target')
# $(window).resize()
$(window).on 'load', ->
  # Load data and test connection to server.
  slowLoad = -> $('slow-load')?.show()
  loadTimeout = delay 12000, slowLoad

  delay 300, ->
    console.log 'Loading data'
        
    PARAMS =
      startTime: Date(Date.now())

    psiturk.recordUnstructuredData 'params', PARAMS

    if DEBUG
      createStartButton()
      clearTimeout loadTimeout
    else
      console.log 'Testing saveData'
      if LOCAL
        clearTimeout loadTimeout
        delay 500, createStartButton
      else
        saveData().then(->
          clearTimeout loadTimeout
          delay 500, createStartButton
        ).catch(->
          clearTimeout loadTimeout
          $('#data-error').show()
        )

createStartButton = ->
  if DEBUG
    initializeExperiment()
    return
  $('#load-icon').hide()
  $('#slow-load').hide()
  $('#success-load').show()
  $('#load-btn').click initializeExperiment


initializeExperiment = ->
  $('#jspsych-target').html ''
  console.log 'INITIALIZE EXPERIMENT'

  # ================================= #
  # ========= BLOCK CLASSES ========= #
  # ================================= #

  class Block
    constructor: (config) ->
      _.extend(this, config)
      # @_block = this  # allows trial to access its containing block for tracking state
      if @_init?
        @_init()

  class TextBlock extends Block
    type: 'text'
    cont_key: []

  class ButtonBlock extends Block
    type: 'button-response'
    is_html: true
    choices: ['Continue']
    button_html: '<button class="btn btn-primary btn-lg">%choice%</button>'

  #  ============================== #
  #  ========= EXPERIMENT ========= #
  #  ============================== #

  img = (name) -> """<img class='display' src='static/images/#{name}.png'/>"""
  

  divider = new TextBlock
    text: "<div class='center'>Press <code>space</code> to continue.</div>"


  quiz = new Block
    preamble: -> markdown """
      # Quiz

    """
    type: 'survey-multi-choice'
    questions: [
      "What is 2+2?"
    ]
    options: [
      ['4', 'Not 4', 'None of the above'],
    ]

  pre_test = new ButtonBlock
    stimulus: ->
      SCORE = 0
      prompt: ''
      psiturk.finishInstructions()
      markdown """
      # Training Completed

      Well done! You've completed the training phase and you're ready to
      play *Web of Cash* for real. You will have **#{test.timeline.length}
      rounds** to make as much money as you can. Remember, #{bonus_text()}

      One more thing: **You must spend *at least* 7 seconds on each round.**
      If you finish a round early, you'll have to wait until 7 seconds have
      passed.

      To thank you for your work so far, we'll start you off with **$50**.
      Good luck!
    """

  finish = new Block
    type: 'survey-text'
    preamble: -> markdown """
        # You've completed the HIT

        Thanks for participating. We hope you had fun! Based on your
        performance, you will be awarded a bonus of
        **$#{calculateBonus().toFixed(2)}**.

        Please briefly answer the questions below before you submit the HIT.
      """

    questions: [
      'Was anything confusing or hard to understand?'
      'What is your age?'
      'Additional coments?'
    ]
    button: 'Submit HIT'

  if DEBUG
    experiment_timeline = [
      quiz
    ]
  else
    experiment_timeline = [
      quiz
      finish
      # pre_test
      # test
      # verbal_responses
      # finish
    ]

  # ================================================ #
  # ========= START AND END THE EXPERIMENT ========= #
  # ================================================ #

  # bonus is the total score multiplied by something
  calculateBonus = ->
    return 0
    bonus = SCORE * PARAMS.bonusRate
    bonus = (Math.round (bonus * 100)) / 100  # round to nearest cent
    return Math.max(0, bonus)
  

  reprompt = null
  save_data = ->
    psiturk.saveData
      success: ->
        console.log 'Data saved to psiturk server.'
        if reprompt?
          window.clearInterval reprompt
        psiturk.computeBonus('compute_bonus', psiturk.completeHIT)
      error: -> prompt_resubmit


  prompt_resubmit = ->
    $('#jspsych-target').html """
      <h1>Oops!</h1>
      <p>
      Something went wrong submitting your HIT.
      This might happen if you lose your internet connection.
      Press the button to resubmit.
      </p>
      <button id="resubmit">Resubmit</button>
    """
    $('#resubmit').click ->
      $('#jspsych-target').html 'Trying to resubmit...'
      reprompt = window.setTimeout(prompt_resubmit, 10000)
      save_data()

  jsPsych.init
    display_element: 'jspsych-target'
    exclusions:
      min_width: 800
      min_height: 600
    timeline: experiment_timeline
    # show_progress_bar: true

    on_finish: ->
      if DEBUG
        jsPsych.data.displayData()
      else
        psiturk.recordUnstructuredData 'final_bonus', calculateBonus()
        save_data()

    on_data_update: (data) ->
      console.log 'data', data
      psiturk.recordTrialData data

