var ERROR_EMAIL = '' // I really hope you set this in experiment.js

_.compose = _.flowRight  // for psiturk
const psiturk = new PsiTurk(uniqueId, adServerLoc, mode);
const urlParams = _.mapValues(Object.fromEntries(new URLSearchParams(window.location.search)), maybeJson)
const prolific = true;
const local = (mode === "demo" || mode === "{{ mode }}")

const CONDITION =
  urlParams.condition ??
  (condition == "{{ condition }}" ? 0 : parseInt(condition, 10))

assert(typeof(CONDITION) == 'number', 'bad condition')

// Test connection to server, then initialize the experiment.

var QUIET = false
const DISPLAY = $('#display')

$(window).on('load', async () => {
  if (local) {
    $('#display').empty()
    await runExperiment()
    $('#display').empty()
  } else {
    await saveData()
    if (mode == 'live') {
      await sleep(3000)
      $('#load-icon').hide();
      let btn = button($('#display'), 'begin')
      btn.button.addClass('animate-bottom').css('margin-top', '40px')
      await btn.clicked
    } else {
      $('#load-icon').hide();
    }
    logEvent('experiment.begin')
    $('#display').empty()
    try {
      await runExperiment()
      await completeExperiment()
    } catch (err) {
      handleError(err)
    }
  }
});


const eventCallbacks = []

function logEvent(event, info={}){
  if (typeof(event) == 'object') {
    info = event;
  } else {
    info.event = event;
  }
  info.time = Date.now();
  for (let f of eventCallbacks) {
    f(info)
  }
  if (!event.includes('mousemove') && !QUIET) {
    console.log('logEvent', info.event, info);
  }
  psiturk.recordTrialData(info);
}

function registerEventCallback(f) {
  eventCallbacks.push(f)
}

function removeEventCallback(f) {
  _.pull(eventCallbacks, f)
}

function eventPromise(predicate) {
  let match = ''
  if (typeof(predicate) == 'string') {
    match = predicate
    predicate = (info) => info.event.startsWith(match)
  }
  let promise = makePromise()
  let func = (info) => {
    if (predicate(info)) {
      logEvent('eventPromise.resolve', {match})
      promise.resolve()
    }
  }
  promise.finally(() => removeEventCallback(func))
  registerEventCallback(func)
  return promise
}

function saveData() {
  logEvent('data.attempt')
  return new Promise((resolve, reject) => {
    if (local || mode === 'demo') {
      resolve('local');
      return;
    }
    const timeout = delay(10000, () => {
      logEvent('data.timeout')
      reject('timeout');
    });
    psiturk.saveData({
      error: () => {
        clearTimeout(timeout);
        logEvent('data.error')
        reject('error');
      },
      success: () => {
        clearTimeout(timeout);
        logEvent('data.success')
        resolve();
      }
    });
  });
};


function completeExperiment() {
  logEvent('experiment.complete');
  $.ajax("complete_exp", {
    type: "POST",
    data: { uniqueId }
  });
  $('#display').html(`
    <h1>Saving data</h1>
    <p>Please do <b>NOT</b> refresh or leave the page!</p>
    <div id="load-icon"></div>
    <div id="submit-error" class="alert alert-danger">
      <strong>Error!</strong> We couldn't contact the database.
      We will try <b><span id="ntry"></span></b> more times before
      continuing without saving the data.
    </div>
  `);
  $("#submit-error").hide();
  let triesLeft = 3;
  const promptResubmit = () => {
    console.log('promptResubmit');
    if (triesLeft > 0) {
      console.log('try again', triesLeft);
      $("#submit-error").show();
      $("#ntry").html(triesLeft);
      triesLeft -= 1;
      return saveData().catch(promptResubmit);
    } else {
      console.log('GIVE UP');
      $('#display').html(`
        <h1>Saving data</h1>
        <div class="alert alert-danger">
          <strong>Error!</strong> We couldn't save your data! Please send us a message on Prolific, then click the button below.
        </div>
        <br><br>
        <button class='btn btn-primary btn-lg' id="resubmit">I reported the error</button>
      `);
      return new Promise(resolve => {
        $('#resubmit').click(() => {
          $('#display').empty();
          resolve('gave up');
        });
      });
    }
  };
  return saveData().catch(promptResubmit).then(showCompletionScreen);
};


async function showCompletionScreen() {
  logEvent('experiment.completion')
  $('#display').empty();
  if (prolific) {
    $("#load-icon").remove();
    $(window).off("beforeunload");
    $('#display').html(`
      <div class='basic-content'>
        <h1>Thanks!</h1>
        <p>Your completion code is <b>${PROLIFIC_CODE}</b>. Click this link to submit:<br>
        <a href="https://app.prolific.co/submissions/complete?cc=${PROLIFIC_CODE}">
          https://app.prolific.co/submissions/complete?cc=${PROLIFIC_CODE}
        </a></p>
      </div>
    `);
  }
};


function handleError(e) {
  logEvent('experiment.error', e)
  let msg = e.stack?.length > 10 ? e.stack : `${e}`;
  const workerIdMessage = typeof workerId !== "undefined" && workerId !== null ? workerId : 'N/A';
  const message = `Prolific Id: ${workerIdMessage}\n${msg}`;
  const link = `<a href="mailto:${ERROR_EMAIL}?subject=ERROR in experiment&body=${encodeURIComponent(message)}">Click here</a> to report the error by email.`;

  $('#display').html(`
    <h1>The experiment encountered an error!</h1>
    <b>${link}</b>
    <p>Please describe at what point in the study the error occurred, and include the following information.
    <pre>${message}</pre>
    After reporting the error, click the button below to submit your data and see the completion code.
    <p><br>
    <button class="btn btn-primary" id="submit">I reported the error</button>
  `);
  $('#submit').click(completeExperiment);
};
