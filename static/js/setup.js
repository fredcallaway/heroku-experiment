/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
/*jshint esversion: 6 */

// ---------- Experiment modes ---------- #
const DEBUG = false;
if (DEBUG) {
  console.log(`\
X X X X X X X X X X X X X X X X X
 X X X X X DEBUG  MODE X X X X X
X X X X X X X X X X X X X X X X X\
`
  );
} else {
  console.log(`\
# =============================== #
# ========= NORMAL MODE ========= #
# =============================== #\
`
  );
}

const LOCAL = (mode == "{{ mode }}");
const CONDITION = LOCAL ? 0 : condition;

// ---------- Initialize PsiTurk ---------- #
const psiturk = new PsiTurk(uniqueId, adServerLoc, mode);
const saveData = function() {
  console.log('saveData');
  return new Promise(function(resolve, reject) {
    if (LOCAL) resolve('local');

    const timeout = delay(5000, function() {
      console.log('TIMEOUT');
      reject('timeout');
    });

    psiturk.saveData({
      error() {
        clearTimeout(timeout);
        console.log('Error saving data!');
        reject('error');
      },
      success() {
        clearTimeout(timeout);
        console.log('Data saved to psiturk server.');
        resolve();
      }
    });
  });
};


// ---------- Test connection to server, then initialize the experiment. ---------- #
// initializeExperiment is defined in experiment.coffee
$(window).on('load', () =>
  saveData()
    .then(() => delay(500, function() {
      $('#welcome').hide();
      return initializeExperiment().catch(handleError);
    }))
    .catch(() => $('#data-error').show())
);

// This function is called once at the end of initializeExperiment.
const startExperiment = function(config) {
  const defaults = {
    display_element: $('#jspsych-target'),
    on_finish() {
      if (LOCAL) {
        return jsPsych.data.displayData();
      } else {
        return submitHit();
      }
    },
    on_data_update(data) {
      console.log('data', data);
      return psiturk.recordTrialData(data);
    }
  };
  
  return jsPsych.init((_.extend(defaults, config)));
};

var submitHit = function() {
  console.log('submitHit');
  $('#jspsych-target').html('<div id="load-icon"></div>');

  let triesLeft = 1;
  var promptResubmit = function() {
    console.log('promptResubmit');
    if (triesLeft) {
      console.log('try again', triesLeft);
      $('#jspsych-target').html(`\
<div class="alert alert-danger">
  <strong>Error!</strong>
  We couldn't contact the database. We will try <b>${triesLeft}</b> more times
  before attempting to submit your HIT without saving the data.

  <div id="load-icon"></div>
</div>\
`
      );
      triesLeft -= 1;
      return saveData().catch(promptResubmit);
    } else {
      console.log('GIVE UP');
      $('#jspsych-target').html(`\
<div class="alert alert-danger">
  <strong>Error!</strong>
  We couldn't save your data! Please contact cocosci.turk@gmail.com to report
  the error. Then click the button below.
</div>
<br><br>
<button class='btn btn-primary btn-lg' id="resubmit">I reported the error</button>\
`
      );
      return new Promise(function(resolve) {
        return $('#resubmit').click(() => resolve('gave up'));
      });
    }
  };

  return saveData()
    .then(psiturk.completeHIT)
    .catch(promptResubmit)
    .then(psiturk.completeHIT);
};


  
var handleError = function(e) {
  let msg;
  console.log('Erorr in experiment', e);
  if (e.stack) {
    msg = e.stack;
  } else if (e.name != null) {
    msg = e.name;
    if (e.message) {
      msg += `: ${e.message}`;
    }
  } else {
    msg = e;
  }
  
  psiturk.recordUnstructuredData('error', msg);

  const message = `\
<pre>
  HitID: ${(typeof hitId !== 'undefined' && hitId !== null) ? hitId[0] : 'N/A'}
  AssignId: ${(typeof assignId !== 'undefined' && assignId !== null) ? assignId : 'N/A'}
  WorkerId: ${(typeof workerId !== 'undefined' && workerId !== null) ? workerId[0] : 'N/A'}

  ${msg}
</pre>\
`;
  
  const link = ('<a href="mailto:cocosci.turk@gmail.com?subject=ERROR in experiment' +
          '&body=#{encodeURIComponent(message)}">Click here</a>');
  
  $('#jspsych-target').html(markdown(`\
# The experiment encountered an error!

${link} to report the error by email. Please describe at what point in the HIT the error
occurred, and include the following

${message}

Then click the button below to submit the HIT.
If you have trouble submitting the HIT, please
contact <cocosci.turk@gmail.com>

<button id="submit">Submit HIT</button>\
`
  )
  );
  return $('#submit').click(submitHit);
};

