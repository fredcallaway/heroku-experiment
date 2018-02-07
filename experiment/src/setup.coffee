# coffeelint: disable=max_line_length, indentation

# ---------- Experiment modes ---------- #
DEBUG = no
LOCAL = no
ERROR = undefined

if mode is "{{ mode }}"
  LOCAL = true
  CONDITION = 0

if DEBUG
  console.log """
  X X X X X X X X X X X X X X X X X
   X X X X X DEBUG  MODE X X X X X
  X X X X X X X X X X X X X X X X X
  """
  CONDITION = 0
  LOG_DEBUG = (args...) -> console.log args...

else
  console.log """
  # =============================== #
  # ========= NORMAL MODE ========= #
  # =============================== #
  """
  CONDITION = parseInt condition
  LOG_DEBUG = (args...) -> null


# ---------- Initialize PsiTurk ---------- #
psiturk = new PsiTurk uniqueId, adServerLoc, mode
saveData = ->
  console.log 'saveData'
  new Promise (resolve, reject) ->
    if LOCAL
      resolve 'local'
      return

    timeout = delay 5000, ->
      console.log 'TIMEOUT'
      reject 'timeout'

    psiturk.saveData
      error: ->
        clearTimeout timeout
        console.log 'Error saving data!'
        reject 'error'
      success: ->
        clearTimeout timeout
        console.log 'Data saved to psiturk server.'
        resolve()


# ---------- Test connection to server, then initialize the experiment. ---------- #
# initializeExperiment is defined in experiment.coffee
$(window).on 'load', ->
  saveData()
    .then -> delay 500, ->
      initializeExperiment().catch handleError
    .catch -> $('#data-error').show()

# This function is called once at the end of initializeExperiment.
startExperiment = (config) ->
  LOG_DEBUG 'run'
  defaults =
    display_element: 'jspsych-target'
    on_finish: ->
      if DEBUG
        jsPsych.data.displayData()
      else
        submitHit()
    on_data_update: (data) ->
      console.log 'data', data
      psiturk.recordTrialData data
  
  jsPsych.init (_.extend defaults, config)

submitHit = ->
  console.log 'submitHit'
  $('#jspsych-target').html '<div id="load-icon"></div>'

  triesLeft = 1
  promptResubmit = ->
    console.log 'promptResubmit'
    if triesLeft
      console.log 'try again', triesLeft
      $('#jspsych-target').html """
        <div class="alert alert-danger">
          <strong>Error!</strong>
          We couldn't contact the database. We will try <b>#{triesLeft}</b> more times
          before attempting to submit your HIT without saving the data.

          <div id="load-icon"></div>
        </div>
      """
      triesLeft -= 1
      return saveData().catch(promptResubmit)
    else
      console.log 'GIVE UP'
      $('#jspsych-target').html """
        <div class="alert alert-danger">
          <strong>Error!</strong>
          We couldn't save your data! Please contact cocosci.turk@gmail.com to report
          the error. Then click the button below.
        </div>
        <br><br>
        <button class='btn btn-primary btn-lg' id="resubmit">I reported the error</button>
      """
      return new Promise (resolve) ->
        $('#resubmit').click -> resolve 'gave up'

  saveData()
    .then(psiturk.completeHIT)
    .catch(promptResubmit)
    .then(psiturk.completeHIT)


  
handleError = (e) ->
  console.log 'Erorr in experiment', e
  if e.stack
    msg = e.stack
  else if e.name?
    msg = e.name
    if e.message
      msg += ': ' + e.message
  else
    msg = e
  
  psiturk.recordUnstructuredData 'error', msg

  message = """
  <pre>
    HitID: #{if hitId? then hitId[0] else 'N/A'}
    AssignId: #{if assignId? then assignId else 'N/A'}
    WorkerId: #{if workerId? then workerId[0] else 'N/A'}

    #{msg}
  </pre>
  """
  
  link = ('<a href="mailto:cocosci.turk@gmail.com?subject=ERROR in experiment' +
          '&body=#{encodeURIComponent(message)}">Click here</a>')
  
  $('#jspsych-target').html markdown """
    # The experiment encountered an error!

    #{link} to report the error by email. Please describe at what point in the HIT the error
    occurred, and include the following

    #{message}

    Then click the button below to submit the HIT.
    If you have trouble submitting the HIT, please
    contact <cocosci.turk@gmail.com>

    <button id="submit">Submit HIT</button>
  """
  $('#submit').click submitHit

