# Heroku experiment template

A starter pack for running online experiments on Heroku using Psiturk or Prolific.

**Note: Looking for the previous version using JsPsych? See the [jspsych branch](https://github.com/fredcallaway/heroku-experiment/tree/jspsych).**

However, I encourage you to give the master version a try. I worked with jspsych for
a long time, and ultimately found that it limited what I could do and forced me into
bad coding patterns. Unlike jspsych, the code here takes full advantage of the power
of modern javascript (in particular, classes and async/await). It also uses a more
flexible (and less error-prone) event-based data-recording system.

## Setup

### Dependencies

Make sure you have all of these installed before continuing:

- Python 3.9+ 
- Postgres: https://www.postgresql.org/download/ or `brew install postgresql`
- Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli

### Installation

Create a new repository using this repository as a template (on github there is a green "Use this template" button at the top of the page). Clone the new repository to your machine and `cd` into the directory from a terminal.

Create a virtual environment and install the requirements with the following commands.

```bash
python3 -m venv env
source env/bin/activate   
pip install -r requirements.txt
```

You can then see the experiment by running `make dev` and opening the printed link (cmd-click). By default the experiment will be served at <http://localhost:22363>. You can change the port number in config.txt (e.g., to allow previewing multiple experiments at once).

### Update university- and app-specific information

- Update the email in experiment.js
- Put your IRB-approved consent form in templates/consent.html.
- **If using prolific:** update the [Prolific] section of config.txt
- **If using mturk:** do a search for "bodacious" to find places where you should change info, mostly in ad.html and config.txt


### Deploy to Heroku

Make sure you're logged into the correct Heroku account using the Heroku CLI (use `heroku auth` to see useful commands).

Create a new app and add a Postgres database. **Note: these commands must be run from the project directory** (the one containing this README.md). You should probably change the name of your app to something less silly.
```
heroku create dizzydangdoozle --buildpack heroku/python
heroku git:remote -a dizzydangdoozle
heroku addons:create heroku-postgresql
```
You can confirm that the heroku site has been created with the `heroku domains`, which will print the domain of your shiny new website!

Make some changes and commit them using git. You can then deploy all commited changes with
```bash
git push -f heroku HEAD:master    
```

This makes heroku build your app, which can take a minute or so. Then your website will be updated. The `HEAD:master` part ensures that you post your current git branch (you can use branches to keep track of different versions of the experiment).

## Developing your experiment

- The structure of the experiment is defined in static/js/experiment.js
- Add any additional experiment files and dependencies to templates/exp.html.
- Run `make dev` to preview your experiment (or use your text editor's preview function).
- Edit, refresh, edit, refresh, edit, refresh....

Important note: Make sure you have disabled the browser cache, either using the developer tools of your browser or by using another tool (such as a live preview tool) that does this for you. Otherwise, you will see an old version of the code in your browser.

From here, you can probably figure out everything else by looking at the code in static/js/experiment.js and static/js/intructions.js. However, you may want to quickly skim the rest of this section before you do that.

### Asyncronous programming

This template makes heavy use of asynchronous programming (Promises), using the `async/await` syntax. If this is new to you, you should look at [this tutorial](https://javascript.info/async-await) before diving in. Javascript `async` support is _incredible_ and it is exactly what you want when developing complex highly interactive web interfaces (e.g., experiments).

If you _are_ familiar with javascript Promises, you'll notice that we do some non-standard things with them, like writing `promise.reject()`. This is because we use the [Deferred Promise](https://medium.com/@imanshurathore/unlocking-the-power-of-deferred-promises-in-javascript-ec28119a527c) design (see `deferredPromise` in utils.js).


### URL parameters

You can control many things about the experiment using URL parameters. For example: http://0.0.0.0:22363/?instruct=2&showSecretStage=true will show you the second stage of the instructions, setting `PARAMS.showSecretStage = true`. You can also jump to a stage of the instructions by name `instruct=introduce_task` or to a different block of the experiment with `block=main` or you. This is extremeley useful when debugging an experiment, as you can imagine.

Important note: The first parameter must be preceeded by `?` and all others must be preceeded by `&`.

### Saving data

Data is recorded with the `DATA.recordEvent` function, e.g. `DATA.recordEvent('trial.complete', {choice, rt})`. You can also use the `DATA.setKeyValue` function for high-level
information that will go into the summary participants.csv file.

It's up to you how you want to handle data representation. Frameworks like jsPsych often batch up all the data for a trial into one object. You can do that if you want; just call `DATA.recordEvent` at the end of each trial passing a big object with all the data. I prefer to just log everything that happens and then I worry about formatting it later. This is the safest way to ensure that you record everything you might need.

**By default, data will not be saved when running locally**. If you want to save data while debugging, follow these steps:

- Make sure you're using `make dev` and not viewing index.html as a static page.
- Visit <http://localhost:22363/test>. The port (22363) is configured in config.txt. The critical addition is to add "/test" at the end of the URL.
- The fields necessary to store your data will be automatically added to the URL. Take note of or change the workerid (something like debug58523) if you wish. Note that if you use the same workerid twice, it will overwrite the previous data.
- The data will be saved to the local participants.db sqlite database.
- See the "Downloading Data" section below for details.

### Preprocessing data

The downside of using event-based data recording is that the data you save requires more preprocessing than a standard one-object-per-trial format. However, it's really not so bad as long as you mark all the events from each trial with a uniqueID (this will happen automatically if you implement your task as a `Component`). Basically, you just filter the long list of events for those that come from your trial (in the example, they start with `task.`). Then you group by uniqueID. You now have a short list of events that contain all the information you'd ever need about each trial trial.

_TODO: add an example python script for preprocessing the data._

### Optional tools

I have included general-purpose tools in the static/js/tools/ directory. 
- inputs.js: classes/functions to handle all the standard user inputs (buttons, sliders, textboxes) ensuring that all interactions are recorded in the data
- alerts.js: modal alerts with personality, powered by [sweetalert2](https://sweetalert2.github.io/)
- component.js: defines the abstact `Component` class that handles a lot of the boilerplate associated with data recording, configuration, and trial sequencing. 
- instructions.js: navigable instructions that can gracefully handle complex user interactions on each page
- quiz.js: define a multiple-choice quiz in text format to put at the end of your instructions
- survey.js: define complex surveys with a JSON object that you can build with a [gui](https://surveyjs.io/)
- canvas.js: basic drawing functionality
- status-bar: a trial- and point-counter with a help button

These tools might make it easier for you to quickly design experiments based on this template. However, _you do not have to use them to use this template!_ If you just want to use this template to streamline the annoying backend stuff (data managment), then you can do that without using anything in tools/

## Posting your study

First, update codeversion in config.txt. This is how the database knows to keep different versions of your study separate. What you do next depends on the recruitment service.

### Prolific

For your first pass, you should create the study with Prolific's web interface. 

1. Set the URL to. `https://<YOUR_APP_DOMAIN>.herokuapp.com/consent?mode=live&workerId={{%PROLIFIC_PID%}}&hitId=prolific&assignmentId={{%SESSION_ID%}}`. Make sure to replace `<YOUR_APP_DOMAIN>` in the link with the current domain, which you can see with the `heroku domains` command.
2. Make sure "I'll use URL parameters" is checked.
3. Select "I'll redirect them using a URL". Copy the code and set it as `PROLIFIC_CODE` in experiment.js, e.g. `const PROLIFIC_CODE = "6A5FDC7A"`.
4. As always, do a dry run with Prolific's "preview" mechanism before actually posting the study. I also recommend running only a couple people on your first go in case there are unforseen issues.

#### Prolific CLI

We also provide an alpha-release CLI for Prolific, using the Prolific API. Run `bin/prolific.py` to see the available commands. The most useful ones are 

- `pay` approves subbmissions and assigns bonuses using the bonus.csv file produced by `bin/fetch_data.py`
- `post_duplicate` posts a copy of your last study (as if you had used Prolific's "duplicate study" feature) with an updated name. You can update the pay and number of places in config.txt. It won't actually post the study without you confirming (after printing a link to preview it on Prolific).

You'll need to install two additional dependencies for this script: `pip install markdown fire`. Note that if you run this command with the virtual environment active, then you'll need to activate the virtual environment running bin/prolific.py in the future. I recommend installing these packages in your global python environment.

### MTurk

I haven't used MTurk in a while, so I'm not sure this actually works, but...

Start the psiturk shell with the command `psiturk`. Run `hit create 30 1.50 0.5` to create 30 hits, each of which pays $1.50 and has a 30 minute time limit. You'll get a warning about your server not running. You are using an external server process, so you can press `y` to bypass the error message.

## Downloading data

To download data for a given version run `bin/fetch_data.py <VERSION>`. If you don't provide a version, it will use the current one in config.txt.

You will find the data in `data/raw/[codeversion]/events/`. There is one file per participant. It is a json list with one object for every time you called `DATA.recordEvent`. This data has identifiers and should not be shared. Make sure not to accidentally put it on github (data is in .gitignore so this shouldn't be a problem). The mapping from the anonymized "wid" to "workerid" is saved in data/raw/<VERSION>/identifiers.csv.

**What if you don't see the data?** If you're looking for data that you generated while testing, make sure you used the /test URL as described above.

If you want to "download" data from the local participants.db database (if you were testing using `make dev`, not on the live heroku page), then use `bin/fetch_data.py --local`. If you want to include data you generated while testing the heroku site (using the /test URL), then use the `--debug` flag. By default, `bin/fetch_data.py` will not download data with "debug" in the workerId or assignmentId.


## Additional Tips

### Posting static versions

It is often useful to have a permanent link to different versions of the experiment. This is easy to do if you have your own personal website that you can rsync to. First set the relevant parameters in bin/post_static. Then you can run e.g. `bin/post_static v1`.

### Text editor

I recommend working in VS Code or one of its clones. The Live Preview functionality integrates the developer console into your editor so you can click on error message and jump to the code. Also, LLMs are great at writing javascript, and you can often get a long way just by describing the task and asking it to write the code for you. If possible, you should use an LLM tool that integrates with your editor. This way, it will automatically write code that is consistent with the template. As of October 2024, I'm using Cursor and loving it.

## FAQ

_Can I check how many participants there are without downloading the full dataset?_

Yes. Use e.g. `heroku pg:psql -c "select count(*) from participants where codeversion = 'v1'"`. You can also open an interactive SQL terminal with just `heroku pg:psql`. Another useful query is `select workerid,codeversion,cond,beginhit,endhit from participants order by beginhit desc;`
 
_Why are you still using jQuery / what year is it?_

I have yet to find an option that is as easy as jQuery but doesn't require compiling your code (which in my experience makes server-side errors very difficult to debug). If you're interested in developing a version of the template that uses React/Vue/Alpine etc..., please get in touch though because I'm curious what this would look like.

_Why are you using psiTurk when you run the study on Prolific?_

The main reason I haven't ditched psiTurk is because it provides balanced condition assignment. I would love to ditch this dependency though, so if this is something you're interested in working on, let me know.


## Contributors

- Fred Callaway
- Carlos Correa
