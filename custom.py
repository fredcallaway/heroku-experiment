# this file imports custom routes into the experiment server

from flask import Blueprint, render_template, request, jsonify, Response, abort, current_app, redirect, url_for
from jinja2 import TemplateNotFound
from functools import wraps
from sqlalchemy import or_
from traceback import format_exc

from psiturk.psiturk_config import PsiturkConfig
from psiturk.experiment_errors import ExperimentError, InvalidUsage
from psiturk.user_utils import PsiTurkAuthorization, nocache

# # Database setup
from psiturk.db import db_session, init_db
from psiturk.models import Participant
from json import dumps, loads

# load the configuration options
config = PsiturkConfig()
config.load_config()
myauth = PsiTurkAuthorization(config)  # if you want to add a password protect route use this

# explore the Blueprint
custom_code = Blueprint('custom_code', __name__, template_folder='templates', static_folder='static')

# Status codes
NOT_ACCEPTED = 0
ALLOCATED = 1
STARTED = 2
COMPLETED = 3
SUBMITTED = 4
CREDITED = 5
QUITEARLY = 6
BONUSED = 7
BAD = 8

@custom_code.route('/')
def demo():
    data = {
        key: "{{ " + key + " }}"
        for key in ['uniqueId', 'condition', 'counterbalance', 'adServerLoc', 'mode']
    }
    data['mode'] = 'demo'
    return render_template('exp.html', **data)


@custom_code.route('/test')
def test():
    import random
    # uid = str(random.randint(0, 100000))
    # uid = uid + ":" + uid
    args = {
        'hitId': 'debug',
        'assignmentId': 'debug',
        'workerId': 'debug' + str(random.randint(0, 100000)),
        'mode': 'debug',
    }
    return redirect(url_for('start_exp', **args))


def get_participants(codeversion):
    return (
        Participant
        .query
        .filter(Participant.codeversion == codeversion)
        # .filter(Participant.status >= 3)  # only take completed
        .all()
    )


@custom_code.route('/data/<codeversion>/<name>', methods=['GET'])
@myauth.requires_auth
@nocache
def download_datafiles(codeversion, name):
    contents = {
        "trialdata": lambda p: p.get_trial_data(),
        "eventdata": lambda p: p.get_event_data(),
        "questiondata": lambda p: p.get_question_data()
    }

    if name not in contents:
        abort(404)

    query = get_participants(codeversion)
    data = []
    for p in query:
        try:
            data.append(contents[name](p))
        except TypeError:
            current_app.logger.error("Error loading {} for {}".format(name, p))
            current_app.logger.error(format_exc())
            
    # current_app.logger.critical('data %s', data)
    ret = "".join(data)
    response = Response(
        ret,
        content_type="text/csv",
        headers={
            'Content-Disposition': 'attachment;filename=%s.csv' % name
        })

    return response


@custom_code.route('/complete_exp', methods=['POST'])
def complete_exp():
    if not 'uniqueId' in request.form:
        raise ExperimentError('improper_inputs')
    unique_id = request.form['uniqueId']

    current_app.logger.info("completed experimente")
    try:
        user = Participant.query.\
            filter(Participant.uniqueid == unique_id).one()
        user.status = COMPLETED
        user.endhit = datetime.datetime.now()
        db_session.add(user)
        db_session.commit()
        resp = {"status": "success"}
    except exc.SQLAlchemyError:
        app.logger.error("DB error: Unique user not found.")
        resp = {"status": "error, uniqueId not found"}
    return jsonify(**resp)


#----------------------------------------------
# example custom route
#----------------------------------------------
@custom_code.route('/my_custom_view')
def my_custom_view():
    current_app.logger.info("Reached /my_custom_view")  # Print message to server.log for debugging 
    try:
        return render_template('custom.html')
    except TemplateNotFound:
        abort(404)

#----------------------------------------------
# example using HTTP authentication
#----------------------------------------------
@custom_code.route('/my_password_protected_route')
@myauth.requires_auth
def my_password_protected_route():
    try:
        return render_template('custom.html')
    except TemplateNotFound:
        abort(404)

#----------------------------------------------
# example accessing data
#----------------------------------------------
@custom_code.route('/view_data')
@myauth.requires_auth
def list_my_data():
    users = Participant.query.all()
    try:
        return render_template('list.html', participants=users)
    except TemplateNotFound:
        abort(404)

#----------------------------------------------
# example computing bonus
#----------------------------------------------

@custom_code.route('/compute_bonus', methods=['GET'])
def compute_bonus():
    # check that user provided the correct keys
    # errors will not be that gracefull here if being
    # accessed by the Javascrip client
    if not request.args.has_key('uniqueId'):
        raise ExperimentError('improper_inputs')  # i don't like returning HTML to JSON requests...  maybe should change this
    uniqueId = request.args['uniqueId']

    try:
        # lookup user in database
        user = Participant.query.\
               filter(Participant.uniqueid == uniqueId).\
               one()
        user_data = loads(user.datastring) # load datastring from JSON
        bonus = 0

        for record in user_data['data']: # for line in data file
            trial = record['trialdata']
            if trial['phase']=='TEST':
                if trial['hit']==True:
                    bonus += 0.02
        user.bonus = bonus
        db_session.add(user)
        db_session.commit()
        resp = {"bonusComputed": "success"}
        return jsonify(**resp)
    except:
        abort(404)  # again, bad to display HTML, but...

