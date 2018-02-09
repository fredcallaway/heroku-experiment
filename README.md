# Psirokuturk

A starter pack for running online experiments with Psiturk on Heroku.

## Requirements

Sadly, PsiTurk requires Python 2.7. If you don't have `pip2`, try using `pip`.

    pip2 install git+https://github.com/NYUCCL/psiTurk psycopg2-binary

Note that requirements.txt is for the heroku app, not for your local environment.

## Setup

1. Clone this repository
2. Create a Heroku account and install the [Heroku toolbelt](https://toolbelt.heroku.com/)
3. Create a new app and add a Postgres database
```
    heroku create YOUR_APP_NAME
    heroku addons:create heroku-postgresql
```
4. Write config variables
```
    ./set_config.py
```

## Usage

### Post HITs

Startup the psiturk shell. Run `hit create 30 1.50 0.5` to create 30 hits that pays 1.50 and has a 30 minute time limit. You'll get a warning about your server not running. You are using an external server process, so you can press `y` to bypass the error message.