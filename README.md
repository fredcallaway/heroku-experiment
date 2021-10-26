# Psirokuturk

A starter pack for running online experiments with Psiturk on Heroku.

## Requirements

This project works with Python 3. Install requirements with
```
pip install -r requirements.txt
```

## Heroku Setup & Customization

1. Clone this repository
2. Create a Heroku account and install the [Heroku toolbelt](https://toolbelt.heroku.com/). Ensure that you're logged in correctly with `heroku auth:whoami`
3. Create a new app and add a Postgres database
```
    heroku create YOUR_APP_NAME --buildpack heroku/python
    heroku git:remote -a YOUR_APP_NAME
    heroku addons:create heroku-postgresql
```
You can confirm that the heroku site has been created with the `heroku domains`, which will print the domain of your shiny new website!

4. Add university-specific information in the template. Check templates/ad.html, templates/error.html, and config.txt for any mention of "Bodacious" University and replace with a more appropriate reference. You should also put your IRB-approved consent form in templates/consent.html.

5. Once you've made your changes and committed, you can push to Heroku with the following command:
```
    git push heroku master
```

If you get an error saying you are saygin  version, try updating runtime.txt with one of the supported versions listed [here](https://devcenter.heroku.com/articles/python-support).

## Usage

### Preview experiment

After installing the requirements, run `make dev` in a terminal. Then visit [http://localhost:22362](http://localhost:22362). The "22362" is set in config.txt and you can change that value if you like (e.g., to allow previewing multiple experiments at once).

### Write your experiment

- The structure of the experiment is defined in static/js/experiment.js
- [Create custom jsPsych plugins](https://www.jspsych.org/overview/plugins/#creating-a-new-plugin) if needed.
- Add your new plugins and any other dependencies to templates/exp.html.
- Edit, refresh, edit, refresh, edit, refresh....
    - TIP: to make this slightly less painful, try adding e.g. `&skip=1` to the URL when you're debugging so that you don't have to keep clicking through the instructions. 

### Post HITs on mturk

Start the psiturk shell with the command `psiturk`. Run `hit create 30 1.50 0.5` to create 30 hits, each of which pays $1.50 and has a 30 minute time limit. You'll get a warning about your server not running. You are using an external server process, so you can press `y` to bypass the error message.

### Running on Prolific

You need to create the study with Prolific's web interface. Use the following link (using the correct domain of course):

https://<YOUR_APP_NAME>.herokuapp.com/consent?mode=live&workerId={{%PROLIFIC_PID%}}&hitId=prolific&assignmentId={{%SESSION_ID%}}

Make sure to replace `<YOUR_APP_NAME>` in the link with your app name. Also replace all three instances of `PROLIFIC_CODE` in templates/exp.html with the code Prolific gives you. As always, do a dry run with Prolific's "preview" mechanism before actually posting the study. I also recommend running only a couple people on your first go in case there are unforseen issues.

### Downloading data

Run `bin/fetch_datay.py <VERSION>` to download data for a given version (experiment_code_version in config.txt). If you don't provide a version, it will use the current one in config.txt by default. The raw psiturk data is put in data/raw. This data has identifiers and should not be put on github (data/raw is in .gitignore so this shouldn't be a problem). Minimally processed (and de-identified) data goes in data/processed. There is a participants.csv file which is basically a cleaned up (pivoted) version of questiondata.csv and one csv file for each jspsych plugin that generated data in the experiment. The mapping from the anonymized "wid" to "workerid" is saved in data/raw/<VERSION>/identifiers.csv.

### Bonuses

If you're running on prolific, here's an easy way to handle bonuses:
- Add `psiturk.recordUnstructuredData('bonus', BONUS)` at the end of your experiment. BONUS is in dollars.
- After downloading data, run `bin/bonus.py <VERSION>`.
- This creates a csv that you can paste into the prolific "bulk bonus payment" window. On a Mac, the contents will automatically be added to your clipboard.

## Contributors

- Fred Callaway
- Carlos Correa
