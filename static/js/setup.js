var ERROR_EMAIL = 'EMAIL NOT FOUND' // I really hope you set this in experiment.js
var PROLIFIC_CODE = 'CODE NOT FOUND' // I really hope you set this in experiment.js

_.compose = _.flowRight  // for psiturk
const psiturk = new PsiTurk(uniqueId, adServerLoc, mode);
const urlParams = _.mapValues(Object.fromEntries(new URLSearchParams(window.location.search)), maybeJson)
const prolific = true;
const local = (mode === "demo" || mode === "{{ mode }}")

if (local) {
  console.log("RUNNING IN LOCAL MODE: DATA WILL NOT BE SAVED!")
}

const CONDITION =
  urlParams.condition ??
  (condition == "{{ condition }}" ? 0 : parseInt(condition, 10))

assert(typeof(CONDITION) == 'number', 'bad condition')

// Test connection to server, then initialize the experiment.

var QUIET = false
const DISPLAY = $('#display')

// EVENTS manages custom event listeners
const EVENTS = {
  listeners: new Map(),

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event).add(callback)
  },

  once(event, callback) {
    const wrapper = (...args) => {
      this.off(event, wrapper)
      callback(...args)
    }
    this.on(event, wrapper)
  },

  promise(event, predicate=(event, data) => true) {
    const promise = deferredPromise()
    const wrapper = (event, data) => {
      if (predicate(event, data)) {
        this.off(event, wrapper)
        promise.resolve({event, data})
      }
    }
    this.on(event, wrapper)
    return promise
  },

  off(event, callback=null) {
    if (this.listeners.has(event)) {
      if (callback) {
        this.listeners.get(event).delete(callback)
      } else {
        this.listeners.delete(event)
      }
    }
  },

  offRecursive(event) {
    for (const [key, value] of this.listeners) {
      if (key.startsWith(event)) {
        this.listeners.delete(key)
      }
    }
  },

  emit(event, data) {
    const parts = event.split('.')
    for (let i = parts.length; i > 0; i--) {
      const namespace = parts.slice(0, i).join('.')
      if (this.listeners.has(namespace)) {
        for (const callback of this.listeners.get(namespace)) {
          callback(event, data)
        }
      }
    }
  }
}

// DATA stores data and uploads it to the database.
const DATA = {
  keyValues: new Map(),
  events: [],

  // Stores a key-value pair
  setKeyValue(key, value, quiet=false) {
    if (!quiet) {
      this.recordEvent('data.setKeyValue', {key, value})
      if (this.keyValues.has(key)) {
        console.log(`WARNING: setKeyValue has overwritten ${key}`)
      }
    }
    this.keyValues.set(key, value)
    psiturk.recordUnstructuredData(key, value)
  },

  // Records an event and emits it to custom listeners
  recordEvent(event, data={}) {
    if (typeof data != "object") {
      data = {data}
    }
    if (data.timestamp === undefined) {
      data.timestamp = Date.now()
    }
    if (!event.includes("mousemove") && !QUIET) {
      console.log("recordEvent", event, data)
    }
    data.event = event
    this.events.push(data)
    psiturk.recordTrialData(data)
    EVENTS.emit(event, data)
  },

  // Returns a function that records events with a given prefix and extra data
  eventRecorder(eventPrefix, extraData) {
    return (event, data) => {
      this.recordEvent(eventPrefix + '.' + event, {...extraData, ...data})
    }
  },

  // Saves data to the server or resolves immediately in local/demo mode
  save() {
    return new Promise((resolve, reject) => {
      if (local || mode === 'demo') {
        this.recordEvent('data.dummy_attempt')  // don't try to contact database in local mode
        resolve('local');
        return;
      }
      this.recordEvent('data.attempt')
      const timeout = delay(10000, () => {
        this.recordEvent('data.timeout')
        reject('timeout');
      });
      psiturk.saveData({
        error: () => {
          clearTimeout(timeout);
          this.recordEvent('data.error')
          reject('error');
        },
        success: () => {
          clearTimeout(timeout);
          this.recordEvent('data.success')
          resolve();
        }
      });
    });
  }
}

// run a sequence of blocks in order
// you can specify a starting block by adding ?block=BLOCK_NAME to the URL
async function runTimeline(...blocks) {
  let start = _.map(blocks, "name").indexOf(urlParams.block)
  if (start != -1) {
    blocks = blocks.slice(start)
  }
  for (const block of blocks) {
    DATA.recordEvent("timeline.start." + block.name)
    await block()
    DATA.recordEvent("timeline.end." + block.name)
  }
}

$(window).on('load', async () => {
  if (local) {
    $('#display').empty()
    await runExperiment()
    showCompletionScreen()
  } else {
    await DATA.save()
    if (mode == 'live') {
      await sleep(3000)
      $('#load-icon').hide();
      let btn = button($('#display'), 'begin')
      btn.button.addClass('animate-bottom').css('margin-top', '40px')
      await btn.clicked
    } else {
      $('#load-icon').hide();
    }
    DATA.recordEvent('experiment.begin', {timestring: (new Date).toTimeString()})
    $('#display').empty()
    try {
      await runExperiment()
      await completeExperiment()
    } catch (err) {
      handleError(err)
    }
  }
});


// saves data, then shows completion screen
function completeExperiment() {
  DATA.recordEvent('experiment.complete');
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
      return DATA.save().catch(promptResubmit);
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
  return DATA.save().catch(promptResubmit).then(showCompletionScreen);
};

async function showCompletionScreen() {
  DATA.recordEvent('experiment.completion')
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
  let msg = e.stack?.length > 10 ? e.stack : `${e}`;
  const workerIdMessage = typeof workerId !== "undefined" && workerId !== null ? workerId : 'N/A';
  DATA.recordEvent('experiment.error', {msg})
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
