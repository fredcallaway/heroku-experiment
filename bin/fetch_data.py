#!env/bin/python
import os
import subprocess
import pandas as pd
from argparse import ArgumentParser, ArgumentDefaultsHelpFormatter
import hashlib
import json

from psiturk.models import Participant  # must be imported after setting params
from sqlalchemy.exc import OperationalError

class Anonymizer(object):
    def __init__(self):
        self.mapping = {}

    def __call__(self, uniqueid):
        if ':' in uniqueid:
            worker_id, assignment_id = uniqueid.split(':')
        else:
            worker_id = uniqueid
        if worker_id not in self.mapping:
            self.mapping[worker_id] = 'w' + hashlib.md5(worker_id.encode()).hexdigest()[:7]
        return self.mapping[worker_id]


def write_csvs(version, debug):
    ps = Participant.query.filter(Participant.codeversion == version).all()
    if not debug:
        ps = [p for p in ps if 'debug' not in p.uniqueid]
    print(len(ps), 'participants')

    # Note: we don't filter by completion status.

    def qdata(p):
        '''
        A hack: to avoid needing to attach condition and other metadata to
        every participant's qdata, we just sprinkle it in here from the DB.
        '''
        rows = p.get_question_data()
        if rows:
            assert rows[-1] == '\n'
        rows += f'{p.uniqueid},condition,{p.cond}\n'
        rows += f'{p.uniqueid},counterbalance,{p.counterbalance}\n'
        rows += f'{p.uniqueid},status,{p.status}\n'
        return rows

    # https://github.com/NYUCCL/psiTurk/blob/master/psiturk/models.py
    contents = {
        "trialdata": lambda p: p.get_trial_data(),
        "eventdata": lambda p: p.get_event_data(),
        "questiondata": qdata,
    }

    for filename in ["trialdata", "eventdata", "questiondata"]:
        data = []
        for p in ps:
            try:
                data.append(contents[filename](p))
            except:
                import traceback
                traceback.print_exc()
        data = "".join(data)

        # write out the data file

        dest = os.path.join('data/raw', version, "{}.csv".format(os.path.splitext(filename)[0]))
        if not os.path.exists(os.path.dirname(dest)):
            os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "w") as fh:
            fh.write(data)


def reformat(version):
    os.makedirs(f'data/processed/{version}', exist_ok=True)
    anonymize = Anonymizer()

    # trialdata
    try:
        df = pd.read_csv(f"data/raw/{version}/trialdata.csv", header=None,
            names = ["uid", "idx", "timestamp", "data"])
    except pd.errors.EmptyDataError:
        print(f"data/raw/{version}/trialdata.csv is empty! Not creating trials.json")
    else:
        trials = []
        for row in df.itertuples():
            data = json.loads(row.data)
            worker_id, assignment_id = row.uid.split(':')
            data['wid'] = anonymize(worker_id)
            trials.append(data)

        with open(f'data/processed/{version}/trials.json', 'w') as f:
            json.dump(trials, f)

    # questiondata: assumes one value for each participant/key combination
    try:
        qdf = pd.read_csv(f'data/raw/{version}/questiondata.csv', header=None)
    except pd.errors.EmptyDataError:
        print(f"data/raw/{version}/question.csv is empty! Not creating participants.json")
    else:
        participants = []
        bonus = {}
        for uid, df in qdf.groupby(0):
            worker_id, assignment_id = uid.split(':')
            pdata = {'wid': anonymize(worker_id)}
            for key, val in df.set_index(1)[2].items():
                pdata[key] = val
                if key == "bonus":
                    bonus[worker_id] = val
            participants.append(pdata)

        with open(f'data/processed/{version}/participants.json', 'w') as f:
            json.dump(participants, f)

        if bonus:
            bonus = pd.Series(bonus)
            print(len(bonus), 'participants to receive bonuses')
            print(f'mean: ${bonus.mean():.2f}  median: ${bonus.median():.2f}')
            bonus.to_csv('bonus.csv', header=None)
            try:
                os.system(f'cat {file} | pbcopy')
                print("Copied bonus information to clipboard")
            except:
                print("Copy bonuses from bonus.csv")


        identifiers = pd.Series(anonymize.mapping, name='wid')
        identifiers.to_csv(f'data/raw/{version}/identifiers.csv', index_label='workerid')


def get_database():
    if os.path.isfile('.database_url'):
        with open('.database_url') as f:
            return f.read()
    else:
        cmd = "heroku config:get DATABASE_URL"
        url = subprocess.check_output(cmd, shell=True).strip().decode('ascii')
        with open('.database_url', 'w') as f:
            f.write(url)
            return url

def set_env_vars():
    # set environment parameters so that we use the remote database
    env = os.environ
    env["PORT"] = ""
    env["ON_CLOUD"] = "1"
    env["DATABASE_URL"] = get_database()

def main(version, debug):
    set_env_vars()
    try:
        write_csvs(version, debug)
    except sqlalchemy.exc.OperationalError:
        print("Cannot access database. Resetting the cached database url. Please try again.")
        os.remove('.database_url')
    reformat(version)

if __name__ == "__main__":
    parser = ArgumentParser(
        formatter_class=ArgumentDefaultsHelpFormatter)
    parser.add_argument(
        "version",
        nargs="?",
        help=("Experiment version. This corresponds to the experiment_code_version "
              "parameter in the psiTurk config.txt file that was used when the "
              "data was collected."))
    parser.add_argument("--debug", help="Keep debug participants", action="store_true")

    args = parser.parse_args()
    version = args.version
    if version == None:
        import configparser
        c = configparser.ConfigParser()
        c.read('config.txt')
        version = c["Task Parameters"]["experiment_code_version"]
        print("Fetching data for current version: ", version)

    main(version, args.debug)
