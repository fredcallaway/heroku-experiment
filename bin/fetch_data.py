#!/usr/bin/env python3

import os
import subprocess
import logging
import requests
from requests.auth import HTTPBasicAuth
import pandas as pd
from argparse import ArgumentParser, ArgumentDefaultsHelpFormatter
import ast
import re
import json
from collections import defaultdict
import configparser

logging.basicConfig(level="INFO")

import hashlib
def hash_id(worker_id):
    return 'w' + hashlib.md5(worker_id.encode()).hexdigest()[:7]

def to_snake_case(name):
    name = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    name = re.sub(r'[.:\/]', '_', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', name).lower()


class Labeler(object):
    """Assigns unique integer labels."""
    def __init__(self, init=()):
        self._labels = {}
        self._xs = []
        for x in init:
            self.label(x)

    def label(self, x):
        if x not in self._labels:
            self._labels[x] = len(self._labels)
            self._xs.append(x)
        return self._labels[x]

    def unlabel(self, label):
        return self._xs[label]

    __call__ = label


def fetch(site_root, filename, version, auth, force=True):
    """Download `filename` from `site_root` and save it in the
    data/raw/`version` data folder.
    """
    url = os.path.join(site_root, version, filename)

    # get the destination to save the data, and don't do anything if
    # it exists already
    dest = os.path.join('data/raw', version, "{}.csv".format(os.path.splitext(filename)[0]))
    if os.path.exists(dest) and not force:
        print('{} already exists. Use --force to overwrite.'.format(dest))
        return

    # download the data
    r = requests.get(url, auth=auth)
    r.raise_for_status()
    data = r.text
    logging.info("Fetched succesfully: %s", url)

    # write out the data file
    if not os.path.exists(os.path.dirname(dest)):
        os.makedirs(os.path.dirname(dest))
    with open(dest, "w") as fh:
        fh.write(data)
    logging.info("Saved to '%s'", os.path.relpath(dest))
    if filename == 'questiondata':
        try:
            df = pd.read_csv(dest, header=None)
        except pd.errors.EmptyDataError:
            logging.info('questiondata.csv is empty')
        else:
            n_pid = df[0].unique().shape[0]
            logging.info('Number of participants: %s', n_pid)

    # # Anonymize PIDs
    # df = pd.read_csv(dest, header=None)
    # df[0] = df[0].map(hash_id)
    # df.to_csv(dest, header=None, index=False)


def reformat_data(version):
    data_path = 'data/raw/{}/'.format(version)
    identifiers = {'worker_id': [], 'assignment_id': [], 'wid': []}

    # Create participants dataframe (pdf).
    def parse_questiondata():
        qdf = pd.read_csv(data_path + 'questiondata.csv', header=None)
        for uid, df in qdf.groupby(0):
            worker_id, assignment_id = uid.split(':')
            if workerid.startswith('5e14'):
                continue  # debugging 
            identifiers['worker_id'].append(worker_id)
            identifiers['assignment_id'].append(assignment_id)
            row = {'wid': hash_id(worker_id)}
            identifiers['wid'].append(row['wid'])

            for key, val in df.set_index(1)[2].items():
                if key == 'params':
                    row.update(ast.literal_eval(val))
                elif key == 'bonus':
                    row['completed'] = True
                    row['bonus'] = float(val)
                else:
                    row[key] = val
            yield row

    try:
        pdf = pd.DataFrame(parse_questiondata())
        pdf['version'] = version
    except pd.errors.EmptyDataError:
        pdf = pd.DataFrame()
    else:
        idf = pd.DataFrame(pd.DataFrame(identifiers).set_index('wid'))
        idf.to_csv(data_path + 'identifiers.csv')

    # Create trials dataframe (tdf).
    def parse_trialdata():
        tdf = pd.read_csv(data_path + 'trialdata.csv', header=None)
        tdf = pd.DataFrame.from_records(tdf[3].apply(json.loads)).join(tdf[0])
        worker_ids = tdf[0].apply(lambda x: x.split(':')[0])
        tdf['wid'] = worker_ids.apply(hash_id)
        return tdf.drop(0, axis=1)

    tdf = parse_trialdata()

    # Split tdf into separate dataframes for each type of trial.
    data = {'participants': pdf}
    for trial_type, df in tdf.groupby('trial_type'):
        # df = df.dropna(axis=1)
        df = df.drop('internal_node_id', axis=1)
        df = df.drop('trial_index', axis=1)
        df.columns = [to_snake_case(c) for c in df.columns]
        data[trial_type] = df


    # Write data.
    path = 'data/processed/{}/'.format(version)
    if not os.path.isdir(path):
        os.makedirs(path)
    for name, df in data.items():
        dest = path + name + '.csv'
        df.to_csv(dest, index=False)
        print('wrote {} with {} rows.'.format(dest, len(df)))

    return data

def main(version, address, username, password):
    files = ["trialdata", "eventdata", "questiondata"]
    for filename in files:
        fetch(address, filename, version, HTTPBasicAuth(username, password))
    reformat_data(version)

def bash(x):
    return subprocess.check_output(x, shell=True).decode().strip()

def get_data_url():
    fn = '.data-url'
    if os.path.isfile(fn) :
        with open(fn) as f:
            return f.read()
    else:
        domain = bash('heroku domains').split('\n')[1]
        url = f'https://{domain}/data'
        with open(fn, 'w') as f:
            f.write(url)
        return url
        
if __name__ == "__main__":
    parser = ArgumentParser(formatter_class=ArgumentDefaultsHelpFormatter)
    parser.add_argument(
        "version",
        nargs="?",
        help=("Experiment version. This corresponds to the experiment_code_version "
              "parameter in the psiTurk config.txt file that was used when the "
              "data was collected."))

    c = configparser.ConfigParser()
    c.read('config.txt')
    sp = c['Server Parameters']

    version = parser.parse_args().version
    if version == None:
        version = c["Task Parameters"]["experiment_code_version"]
        print("Fetching data for current version: ", version)
    main(version, get_data_url(), sp['login_username'], sp['login_pw'])
