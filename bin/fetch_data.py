#!/usr/bin/env python3

import os
import subprocess
from argparse import ArgumentParser, ArgumentDefaultsHelpFormatter
import hashlib
import json
import glob
import csv
from preprocessing import DataProcessor

# set environment parameters so that we use the remote database

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


class Anonymizer(object):
    def __init__(self, enabled=True):
        self.mapping = {}
        self.enabled = enabled

    def __call__(self, worker_id):
        if not self.enabled or 'debug' in worker_id:
            return worker_id
        if worker_id not in self.mapping:
            self.mapping[worker_id] = 'w' + hashlib.md5(worker_id.encode()).hexdigest()[:7]
        return self.mapping[worker_id]

def pick(obj, keys):
    return {k: obj.get(k, None) for k in keys}

def write_csv(file, data, header=True):
    # Preserve order from first dict and add any new keys from subsequent dicts
    keys = list(data[0].keys())
    for d in data[1:]:
        for k in d.keys():
            if k not in keys:
                keys.append(k)

    with open(file, 'w', newline='') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=keys)
        if header:
            writer.writeheader()
        for row in data:
            writer.writerow(row)


def process_data(version):
    input_dir = f"data/raw/{version}/events"
    output_dir = f"data/processed/{version}"
    os.makedirs(output_dir, exist_ok=True)
    assert os.path.exists(input_dir), f"Input directory {input_dir} does not exist"

    # Find all parse methods
    parse_methods = [m for m in dir(DataProcessor) if hasattr(getattr(DataProcessor, m), '_parser'  )]    
    results = {m: [] for m in parse_methods}

    # Process each JSON file
    for json_file in glob.glob(f"{input_dir}/*.json"):
        print(json_file)
        processor = DataProcessor.load(json_file)
        
        for method in parse_methods:
            results[method].extend(getattr(processor, method)())

    # Save results
    for method, data in results.items():
        kind = getattr(processor, method)._parser
        if kind == 'csv':
            output_name = method + '.csv'
            write_csv(f"{output_dir}/{output_name}", data)
            print(f"Wrote {output_dir}/{output_name}")
        elif kind == 'json':
            output_name = method + '.json'
            with open(f"{output_dir}/{output_name}", 'w') as f:
                json.dump(data, f)
            print(f"Wrote {output_dir}/{output_name}")



def write_data(version, mode):
    anonymize = Anonymizer(enabled = mode == 'live')

    if mode != 'local':
        env = os.environ
        env["PORT"] = ""
        env["ON_CLOUD"] = "1"
        env["DATABASE_URL"] = get_database()
        # what should go here??

    from psiturk.models import Participant  # must be imported after setting env params
    ps = Participant.query.filter(Participant.codeversion == version).all()

    if mode == 'live':
        ps = [p for p in ps
            if 'debug' not in p.uniqueid
            and not p.workerid.startswith('601055')  # the "preview" participant
        ]
    # Note: we don't filter by completion status.

    metakeys = ['condition', 'counterbalance', 'assignmentId', 'hitId', 'useragent', 'mode', 'status']
    participants = []

    os.makedirs(f'data/raw/{version}/events/', exist_ok=True)
    bonus = {}
    for p in ps:
        if p.datastring is None:
            continue
        datastring = json.loads(p.datastring)

        wid = anonymize(p.workerid)

        meta = pick(datastring, metakeys)
        meta['wid'] = wid
        for k, v in datastring['questiondata'].items():
            if k.lower() == 'params':
                for k1, v1 in v.items():
                    if k1 == 'graphRenderOptions':
                        continue
                    meta[k1] = v1

            else:
                meta[k] = v
        participants.append(meta)
        if 'bonus' in meta:
            bonus[p.workerid] = meta['bonus']

        trialdata = [d['trialdata'] for d in datastring['data']]

        with open(f'data/raw/{version}/events/{wid}.json', 'w') as f:
            json.dump(trialdata, f)

    write_csv(f'data/raw/{version}/participants.csv', participants)

    with open(f'data/raw/{version}/identifiers.json', 'w') as f:
        json.dump(anonymize.mapping, f)

    with open(f'data/raw/{version}/bonus.json', 'w') as f:
        json.dump(bonus, f)

    with open(f'bonus.json', 'w') as f:
        json.dump(bonus, f)

    print(len(participants), 'participants')
    print(f'data/raw/{version}/participants.csv')

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
    parser.add_argument("--local", help="Use local database (implies --debug)", action="store_true")
    parser.add_argument("--nofetch", help="Skip fetching data", action="store_true")
    parser.add_argument("--process", help="Process the data", action="store_true")

    args = parser.parse_args()
    mode = 'local' if args.local else 'debug' if args.debug else 'live'

    version = args.version
    if version == None:
        import configparser
        c = configparser.ConfigParser()
        c.read('config.txt')
        version = c["Task Parameters"]["experiment_code_version"]
        print("Using current version: ", version)

    if not args.nofetch:
        write_data(version, mode)
    if args.process:
        process_data(version)
