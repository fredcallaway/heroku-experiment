# Heroku experiment template

A starter pack for running online experiments on Heroku using Psiturk or Prolific.

**Note: Looking for the previous version using JsPsych? See the [jspsych branch](https://github.com/fredcallaway/heroku-experiment/tree/jspsych).**

## Setup

### Dependencies

Make sure you have all of these installed before continuing:

- Python 3.9+ 
- Postgres: https://www.postgresql.org/download/ or `brew install postgresql`
- Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli

### Installation

Create a new repository using this repository as a template (on github there is a green "Use this template" button at the top of the page). Clone the new repository to your machine and `cd` into the directory from a terminal.

Create a virtual environment and install the requirements with the following commands. We install pandas separately because we only need it locally (for data preprocessing).

```bash
python3 -m venv env
source env/bin/activate   
pip install -r requirements.txt
pip install pandas
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
- You will find some tutorial-like information there and in static/js/instructions.js
- If you have multiple conditions, use the CONDITION variable. The number of conditions is set in config.txt. You can manually specify the condition while debugging by adding `&condition=1` to the URL.
- Add any additional experiment files and dependencies to templates/exp.html.
- Run `make dev` to preview your experiment.
- Edit, refresh, edit, refresh, edit, refresh....


### Saving data
Data is recorded with the `logEvent` function, e.g. `logEvent('trial.complete', {choice, rt})`.

It's up to you how you want to handle data representation. Frameworks like jsPsych often batch up all the data for a trial into one object. You can do that if you want; just call `logEvent` at the end of each trial passing a big object with all the data. I prefer to just put a logEvent any time anything happens and then I worry about formatting it later.

**By default, data will not be saved when running locally**. If you want to save data while debugging, follow these steps:

- Make sure you're using `make dev` and not viewing index.html as a static page.
- Visit <http://localhost:22363/test>. The port (22363) is configured in config.txt. The critical addition is to add "/test" at the end of the URL.
- The fields necessary to store your data will be automatically added to the URL. Take note of or change the workerid (something like debug58523) if you wish. Note that if you use the same workerid twice, it will overwrite the previous data.
- The data will be saved to the local participants.db sqlite database.
- See the "Downloading Data" section below for details.

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

You will find the data in `data/raw/[codeversion]/events/`. There is one file per participant. It is a json list with one object for every time you called `logEvent`. This data has identifiers and should not be shared. Make sure not to accidentally put it on github (data is in .gitignore so this shouldn't be a problem). The mapping from the anonymized "wid" to "workerid" is saved in data/raw/<VERSION>/identifiers.csv.

**What if you don't see the data?** If you're looking for data that you generated while testing, make sure you used the /test URL as described above.

If you want to "download" data from the local participants.db database (if you were testing using `make dev`, not on the live heroku page), then use `bin/fetch_data.py --local`. If you want to include data you generated while testing the heroku site (using the /test URL), then use the `--debug` flag. By default, `bin/fetch_data.py` will not download data with "debug" in the workerId or assignmentId.

## Posting static versions

It is often useful to have a permanent link to different versions of the experiment. This is easy to do if you have your own personal website that you can rsync to. First set the relevant parameters in bin/post_static. Then you can run e.g. `bin/post_static v1`.

## FAQ

_Can I check how many participants there are without downloading the full dataset?_

Yes. Use e.g. `heroku pg:psql -c "select count(*) from participants where codeversion = 'v1'"`. You can also open an interactive SQL terminal with just `heroku pg:psql`. Another useful query is `select workerid,codeversion,cond,beginhit,endhit from participants order by beginhit desc;`

## Contributors

- Fred Callaway
- Carlos Correa
