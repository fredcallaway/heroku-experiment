# Heroku experiment template

A starter pack for running online experiments on Heroku using Psiturk or Prolific.

## Setup

### Dependencies

Make sure you have all of these installed before continuing:

- Python 3.9+ 
- Postgres: https://www.postgresql.org/download/ or `brew install postgresql`
- Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli

### Installation

Create a new repository using this repository as a template (on github there is a green "Use this template" button at the top of the page). Clone the new repository to your machine and `cd` into the directory from a terminal.

Create a virtual environment and install the requirements with the following commands. We install pandas separately because we only need it locally (for data preprocessing).
```
python3 -m venv env
source env/bin/activate   
pip install -r requirements.txt
pip install pandas
```

You can then see the experiment by running `make dev` and opening the printed link (cmd-click). By default the experiment will be served at <http://localhost:22362>. You can change the port number in config.txt (e.g., to allow previewing multiple experiments at once).

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
```
git push heroku master
```

This makes heroku build your app, which can take a minute or so. Then your website will be updated.

## Developing your experiment

- The structure of the experiment is defined in static/js/experiment.js
- You will find some tutorial-like information there and in static/js/instructions.js
- If you have multiple conditions, use the CONDITION variable. The number of conditions is set in config.txt. You can manually specify the condition while debugging by adding `&condition=1` to the URL.
- Add any additional experiment files and dependencies to templates/exp.html.
- Run `make static` to preview your experiment.
- Edit, refresh, edit, refresh, edit, refresh....

**By default, data will not be saved when running locally**. If you want to save data while debugging, follow these steps:

- Run `make dev` instead of make `static`
- Visit <http://localhost:22362/test>. The port (22362) is configured in config.txt. 
- The fields necessary to store your data will be automatically added to the URL. Take note of or change the workerid (something like debug58523) if you wish. Note that if you use the same id twice, it will overwrite the previous data.
- The data will be saved to the local participants.db sqlite database.

## Downloading data

- Run `bin/fetch_data.py [codeversion]`. codeversion is set to the current version (set in config.txt) if you don't specify it.
- Pass the `--local` flag if you want to "download" from the local participants.db database.
- You will find the data in `data/raw/[codeversion]/events/`. There is one file per participant. It is a json list with one object for every time you called `logEvent`.
- Note: it's up to you how you want to handle data representation. Frameworks like jsPsych often batch up all the data for a trial into one object. You can do that if you want; just call `logEvent` at the end of each trial passing a big object with all the data. I prefer to just put a logEvent any time anything happens and then I worry about formatting it later.

## Posting your study

First, update codeversion in config.txt. This is how the database knows to keep different versions of your study separate. What you do next depends on the recruitment service.

### Prolific

For your first pass, you should create the study with Prolific's web interface. 

1. Set the URL to. `https://<YOUR_APP_DOMAIN>.herokuapp.com/consent?mode=live&workerId={{%PROLIFIC_PID%}}&hitId=prolific&assignmentId={{%SESSION_ID%}}`. Make sure to replace `<YOUR_APP_DOMAIN>` in the link with the current domain, which you can see with the `heroku domains` command.
2. Make sure "I'll use URL parameters" is checked.
3. Select "I'll redirect them using a URL". Copy the code and set it as `PROLIFIC_CODE` in experiment.js, e.g. `const PROLIFIC_CODE = "6A5FDC7A"`.
4. As always, do a dry run with Prolific's "preview" mechanism before actually posting the study. I also recommend running only a couple people on your first go in case there are unforseen issues.

We also provide an alpha-release CLI for Prolific, using the Prolific API. Run `bin/prolific.py` to see the available commands. The most useful ones are 

- `approve_and_bonus` does what you think it does using the bonus.csv file produced by `bin/fetch_data.py`
- `post_duplicate` posts a copy of your last study (as if you had used Prolific's "duplicate study" feature) with an updated name. You can update the pay and number of places in config.txt. It won't actually post the study without you confirming (after printing a link to preview it on Prolific).

You'll need to install two additional dependencies for this script: `pip install markdown fire`

### MTurk

I haven't used MTurk in a while, so I'm not sure this actually works, but...

Start the psiturk shell with the command `psiturk`. Run `hit create 30 1.50 0.5` to create 30 hits, each of which pays $1.50 and has a 30 minute time limit. You'll get a warning about your server not running. You are using an external server process, so you can press `y` to bypass the error message.

## Downloading data

To download data for a given version run

```
bin/fetch_data.py <VERSION>
```

If you don't provide a version, it will use the current one in config.txt.

The raw psiturk data is put in data/raw. This data has identifiers and should not be shared. Make sure not to accidentally put it on github (data is in .gitignore so this shouldn't be a problem). The mapping from the anonymized "wid" to "workerid" is saved in data/raw/<VERSION>/identifiers.csv.

Minimally processed (and de-identified) data is written as JSON files in data/processed.

Note: **data will not be saved when testing locally**. If you want to save data while debugging, you will need to run the experiment on heroku and pass the relevant URL parameters, for example:

https://dizzydangdoozle-4cd6ae16d401.herokuapp.com/exp?mode=live&workerId=debug123&hitId=prolific&assignmentId=debug123

If you don't want to overwrite the previously saved debug data, you have to change the workerId or assignmentId. 

Additionally, by default `bin/fetch_data.py` will not download data with "debug" in the workerId or assignmentId. You can pass the `--debug` flag to disable this behavior and download all data.

## Posting static versions

It is often useful to have a permanent link to different versions of the experiment. This is easy to do if you have your own personal website that you can rsync to. First set the relevant parameters in bin/post_static. Then you can run e.g. `bin/post_static v1`.

## FAQ

_Can I check how many participants there are without downloading the full dataset?_

Yes. Use e.g. `heroku pg:psql -c "select count(*) from participants where codeversion = 'v1'"`. You can also open an interactive SQL terminal with just `heroku pg:psql`. Another useful query is `select workerid,codeversion,cond,beginhit,endhit from participants order by beginhit desc;`

## Contributors

- Fred Callaway
- Carlos Correa
