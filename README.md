# Psirokuturk

A starter pack for running online experiments with Psiturk on Heroku.

## Requirements

This project works with Python 3. Install requirements with
```
pip install -r requirements.txt
```

## Heroku Setup & Customization

1. Clone this repository
2. Create a Heroku account and install the [Heroku toolbelt](https://toolbelt.heroku.com/)
3. Create a new app and add a Postgres database
```
    heroku create YOUR_APP_NAME --buildpack heroku/python
    heroku git:remote -a YOUR_APP_NAME
    heroku addons:create heroku-postgresql
```
4. Add university-specific information in the template. Check templates/ad.html, templates/error.html, and config.txt for any mention of "Bodacious" University and replace with a more appropriate reference. You should also put your IRB-approved consent form in templates/consent.html.

5. Once you've made your changes and committed, you can push to Heroku with the following command:
```
    git push heroku master
```

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

https://YOUR_APP_NAME.herokuapp.com/consent?mode=live&workerId={{%PROLIFIC_PID%}}&hitId=prolific&assignmentId={{%SESSION_ID%}}


Make sure to replace `PROLIFIC_CODE` in templates/exp.html with the code Prolific gives you. As always, do a dry run with Prolific's "preview" mechanism before actually posting the study. I also recommend running only a couple people on your first go in case there are unforseen issues.

## Contributors

- Fred Callaway
- Carlos Correa
