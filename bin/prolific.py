#!/usr/bin/env python3
import sys
import subprocess
import os
import re
import requests
from configparser import ConfigParser
from markdown import markdown
import random
from fire import Fire
from functools import cache, cached_property


class Prolific(object):
    """Prolific API wrapper and CLI interface.

    Most commands take an optional --study argument. This can be either an
    actual study id or an index such that 0 (the default value) is the most
    recently posted study, 1 is the one before that, etc...
    """
    def __init__(self, token=None):
        super(Prolific, self).__init__()
        if token is None:
            token = find_token()
        if not token:
            raise ValueError('You must provide a token, create a .prolific_token file, or set a PROLIFIC_TOKEN environment variable.')

        self.token = token

    @cached_property
    def project_id(self):
        if os.path.isfile('.project_id'):
            with open('.project_id') as f:
                return f.read()
        else:
            print(
                "Please enter your prolific project id.\n"
                "You can find this in the URL when you select your project on the the prolific website, e.g\n"
                "https://app.prolific.co/researcher/workspaces/projects/644364ccfceb189178b7187c\n"
                "You can also enter the whole URL"
            )
            project_id = input("project id: ")
            if 'projects/' in project_id:
                project_id = project_id.split('projects/')[1].strip().split('/')[0]

            with open('.project_id', 'w') as f:
                f.write(project_id)
                print("Saved to .project_id - we won't ask again.")
            return project_id

    def _request(self, method, url, **kws):
        if url.startswith('/'):
            url = 'https://api.prolific.co/api/v1' + url
        if not url.endswith('/') and '?' not in url:  # adding / prevents redirecting POST requests
            url += '/'
        r = requests.request(method, url, **kws, headers={
            'Authorization': f'Token {self.token}',
        })
        response = r.json()
        if r.ok:
            return response
        else:
            print(f'Problem with API request: {url}')
            print(response)
            exit(1)

    @cache
    def _studies(self):
        res = self._request('GET', f'/projects/{self.project_id}/studies?limit=1000')
        if len(res['results']) != res['meta']['count']:
            print("Some studies were not retrieved. You might have to implemnent paging.")

        return [s for s in res['results'] if s['status'] != 'UNPUBLISHED' ]

    @cache
    def _submissions(self, study_id):
        res = self._request('GET', f'/studies/{study_id}/submissions?limit=1000')
        if len(res['results']) != res['meta']['count']:
            print("Some submissions were not retrieved. You might have to implemnent paging.")
            exit(1)
        return res['results']

    def summary_csv(self):
        """Generates a summary of all participants for this project"""
        records = []
        for study in self._studies():
            for sub in self._submissions(study['id']):
                records.append({
                    'study_id': study['id'],
                    'participant_id': sub['participant_id'],
                    'started_at': sub['started_at'],
                    'is_complete': sub['is_complete'],
                    'minutes_taken': None if sub['time_taken'] is None else round(sub['time_taken'] / 60, 2),
                    'basepay': study['reward'] / 100 if sub['is_complete'] else 0,
                    'bonus': sum(sub['bonus_payments']) / 100,
                    'ip': sub['ip'],
                })

        import pandas as pd
        pd.DataFrame(records).to_csv('prolific_summary.csv')


    def approve_all(self, study=0, ignore_code=False):
        """Approve all submissions of the last study.

        The "last" study refers to the most recently posted study within your project
        """
        study_id = self.study_id(study)
        to_approve = []
        bad_code = []
        completion_codes = [x['code']
            for x in self._request('GET', f'/studies/{study_id}/')['completion_codes']
            if x['code_type'] == "COMPLETED"
        ]

        for sub in self._submissions(study_id):
            if sub['status'] != 'AWAITING REVIEW':
                continue
            if ignore_code or sub['study_code'] in completion_codes:
                to_approve.append(sub["participant_id"])
            else:
                bad_code.append(sub["participant_id"])

        if bad_code:
            print(f'{len(bad_code)} submissions have an incorrect code. Check',
                f"https://app.prolific.co/researcher/workspaces/studies/{study_id}/submissions")

        if to_approve:
            self._request('POST', "/submissions/bulk-approve/", {
                "study_id": study_id,
                "participant_ids": to_approve
            })
            print(f'Approved {len(to_approve)} submissions')
        else:
            print('No submissions to approve')

    def assign_bonuses(self, study=0, bonuses='bonus.csv'):
        """Assign bonuses specified in a dictionary or file.

        By default will use bonus.csv, which has format workerid,bonus_in_dollars (no header).
        """
        study_id = self.study_id(study)

        if isinstance(bonuses, str):
            file = bonuses

            if file.endswith('.json'):
                import json
                with open(file) as f:
                    bonuses = json.load(f)

            if file.endswith('.csv'):
                import pandas as pd
                bonuses = dict(pd.read_csv(file, header=None).set_index(0)[1])

        assert isinstance(bonuses, dict)

        self._prolific.assign_bonuses(self._study_id, bonuses)

        previous_bonus = {sub['participant_id']: sum(sub['bonus_payments']) / 100
                          for sub in self._submissions(study_id)}

        # n_bonused = sum(previous_bonus > 0)
        # if n_bonused:
        #     print(f'{n_bonused} participants already have bonuses, {len(bonuses) - n_bonused} to be bonused')
        participants = previous_bonus.keys()
        missing = set(bonuses.keys()) - set(participants)
        if missing:
            print('WARNING: some entries of bonuses.csv do not have submissions. Skipping these.')
            print('\n'.join(f'{p},{bonus:.2f}' for p, bonus in bonuses.items() if p in missing))
            print()

        new_bonus = {
            p: bonuses.get(p, 0) - previous_bonus[p] for p in participants
        }
        bonus_string = '\n'.join(f'{p},{bonus:.2f}' for p, bonus in new_bonus.items() if bonus > 0)

        if not bonus_string:
            print('No bonuses due')
        else:
            resp = self._request('POST', '/submissions/bonus-payments/', {
                'study_id': study_id,
                'csv_bonuses': bonus_string
            })

            amt = resp['total_amount'] / 100
            yes = input(f'Pay ${amt:.2f} in bonuses? [N/y]: ')
            if yes == 'y':
                self._request('POST', f'/bulk-bonus-payments/{resp["id"]}/pay/')
                print('Bonuses paid')
            else:
                print('NOT paying bonuses')

    def pay(self, study=0, bonuses='bonus.csv'):
            """Run approve_all and then assign_bonuses for the given study."""
            self.approve_all(study)
            self.assign_bonuses(study, bonuses)

    def update_places(self, new_total, study=0):
        """Set the total number of participants for the last study to `new_total`

        You can also lower the number of places, though not below the current number of
        completed + active participants.
        """
        study_id = self.study_id(study)
        self.add_places(study_id, new_total)

    def pause(self, study=0):
        """Temporarily pause recruiting new participants"""
        study_id = self.study_id(study)
        self.post(f'/studies/{study_id}/transition/', {
            "action": "PAUSE"
        })

    def start(self, study=0):
        """Resume recruiting participants (after pausing)"""
        study_id = self.study_id(study)
        self.post(f'/studies/{study_id}/transition/', {
            "action": "START"
        })

    def link(self, study=0):
        """Print the link to the submissions page for the given study"""
        study_id = self.study_id(study)
        return f"https://app.prolific.co/researcher/workspaces/studies/{study_id}/submissions"

    def total_cost(self):
        """Total cost in dollars accrued by this project"""
        return sum(s['total_cost'] for s in self._studies()) / 100

    def study_id(self, n):
        """The study id for the study run `n` studies ago (0 is most recent)."""
        if isinstance(n, str): return n
        return self._studies()[-(n+1)]['id']

    def post_duplicate(self, study=0, **kws):
        """Post a duplicate of the given study using current fields in config.txt"""
        study_id = self.study_id(study)
        # check that changes are pushed
        try:
            diff = subprocess.getoutput('git diff --stat heroku/master')
        except:
            try:
                diff = subprocess.getoutput('git diff --stat origin/master')
            except:
                diff = ''

        if diff != '':
            print("WARNING: The git working tree has unpushed changes.")
            print(diff)
            y = input('Continue anyway? [y/N] ')
            if y.lower() != 'y':
                print('Aborting')
                exit(1)

        new = self._request('POST', f'/studies/{study_id}/clone/')
        new_id = new['id']
        if 'name' not in kws:
            kws['name'] = new['name'].replace(' Copy', '')
        if 'internal_name' not in kws:
            kws['internal_name'] = generate_internal_name()

        for k, v in dict(read_config()['Prolific']).items():
            if k == 'description':
                v = markdown(v)
            kws[k] = v

        if '.' in kws['reward']:
            print('WARNING: found a . in config.txt reward. Specify this value in cents (removing for now)')
            kws['reward'] = kws['reward'].replace('.', '')
        if int(kws['reward']) > 1000:
            reward = f"${kws['reward'] / 100:.2f}"
            confirm = input(f'High reward detected: {reward} per person. Is that right? [y/N] ')
            if confirm != 'y':
                print('NOT posting')
                return

        new = self._request('PATCH', f'/studies/{new_id}/', json=kws)

        print('\n------------------------------ study configuration ------------------------------')
        for k in ['name', 'internal_name', 'description', 'reward', 'total_available_places']:
            print(k + ': ' + str(new[k]))
        print('---------------------------------------------------------------------------------')
        print(f"TOTAL COST (before bonus): ${new['total_cost'] / 100:.2f}")
        print(f"DRAFT: https://app.prolific.co/researcher/workspaces/studies/{new_id}")

        study_link = (new['external_study_url']
            .replace('{{%PROLIFIC_PID%}}', 'debug' + str(random.randint(0, 100000)))
            .replace('{{%STUDY_ID%}}', 'debug')
            .replace('{{%SESSION_ID%}}', 'debug')
        )
        print("STUDY LINK:", study_link)

        confirm = input(f'Go ahead? [y/N] ')
        if confirm.lower() == 'y' and new['total_cost'] > 20000:
            confirm = input("EXPENSIVE! Just to be sure, you want to spend", new['total_cost'], 'correct? [y/N] ')
        if confirm.lower() == 'y':
            self._request('POST', f'/studies/{new_id}/transition/', {
                "action": "PUBLISH"
            })
            print('Posted! See submssisions at:')
            print(f'https://app.prolific.co/researcher/workspaces/studies/{new_id}/submissions')
        else:
            confirm = input('NOT posting. Keep draft? [Y/n] ')
            if confirm.lower() == 'n':
                self._request('DELETE', '/studies/' + new['id'])

    def check_wage(self, study=0, target_wage=12):
        """Summarizes time and total payment for the given study"""
        study_id = self.study_id(study)
        from dateutil.parser import parse
        import numpy as np

        basepay = self._request('GET', f'/studies/{study_id}')['reward']

        times = []
        pays = []
        for sub in self._request('GET', f'/studies/{study_id}/submissions')['results']:
            if not sub['is_complete']:
                continue
            seconds = (parse(sub['completed_at']) - parse(sub['started_at'])).total_seconds()
            hrs = seconds / 3600
            times.append(hrs)
            bonus = sum(sub['bonus_payments'])
            totalpay = (basepay + bonus) / 100
            pays.append(totalpay)

        pays = np.array(pays)
        times = np.array(times)

        try:
            import uniplot
            uniplot.plot(pays, 60*times, x_unit=" min", y_unit=" $", title="Pay by Time")
        except ImportError:
            print('pip install uniplot to get a nice plot here')

        print(f'median time is: {60*np.median(times):.2f} minutes')
        print(f'average pay is: ${np.median(pays):.2f}')
        print(f'median wage is: ${np.median(pays / times):.2f}/hr')

        inc = np.arange(-5, 5, .05).reshape((-1, 1))
        W = (pays + inc) / times
        i = np.argmax(np.median(W, axis=1) > target_wage)

        missing_base = round(inc[i][0], 2)
        new_base = (basepay / 100) + inc[i][0]
        print(f'base pay is off by ${-missing_base:+.2f}, should be ${new_base:.2f}')

    def add_places(self, study_id, new_total):
        self._request('PATCH', f'/studies/{study_id}/', dict(total_available_places=new_total))


def find_token():
    if os.path.isfile(".prolific_token"):
        with open('.prolific_token') as f:
            token = f.read().strip()
            if token:
                return token
    token = os.getenv('PROLIFIC_TOKEN')
    if token:
        return token
    token = input('PROLIFIC_TOKEN environment variable not found. Please enter it here: ')
    if not token.strip():
        print("Exiting.")
        exit(1)
    if input("Would you like to save it for future use? [y/N]") == "y":
        with open('.prolific_token', 'w') as f:
            f.write(token)
        with open(".gitignore", "a") as f:
            f.write('\n.prolific_token')
        print("Saved to .prolific_token — we added this file to your .gitignore as well.")
        return token

EXAMPLE_CONFIG = """
[Prolific]
name = Block Puzzles
project_name = blocks
reward = 300
total_available_places = 15
estimated_completion_time = 15
description =
    In this study, you will solve a series of puzzles that involve
    building shapes out of blocks.
"""

def read_config():
    if not os.path.isfile('config.txt'):
        print("No config.txt detected. It should look something like this:", EXAMPLE_CONFIG)
    conf = ConfigParser()
    conf.read('config.txt')
    return conf

def generate_internal_name():
    conf = read_config()
    try:
        version = conf["Task Parameters"]["experiment_code_version"]
    else:
        from datetime import datetime
        version = datetime.now().strftime('%b%d')
    try:
        project_name = conf["Prolific"]["project_name"]
    except:
        project_name = conf["Prolific"]["name"]
    sha = subprocess.getoutput('git rev-parse HEAD')[:8]
    return ' '.join([project_name, version, sha])


if __name__ == '__main__':
    Fire(Prolific)