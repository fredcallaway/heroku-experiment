# Psirokulific Template

A template for running online experiments using using Psiturk, Heroku, and Prolific.

## Requirements

This project works with Python 3. Install requirements with
```
pip install -r requirements.txt
```

You can run experiment code in a number of ways:
- Preview [index.html](index.html) in your browser.
- To test the entire experiment, run `make dev` then visit [http://localhost:22362](http://localhost:22362). You can also preview the experiment page [here](http://localhost:22362/testexperiment).

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

TODO

## Contributors

- Fred Callaway
- Carlos Correa
