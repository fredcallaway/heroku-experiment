#!/usr/bin/env python3
import pandas as pd
import os
import configparser

def main(codeversion):
    qd = pd.read_csv(f'data/raw/{codeversion}/questiondata.csv', header=None)
    x = qd.loc[qd[1] == 'bonus']
    bonus = pd.DataFrame({
        'participant_id': x[0].apply(lambda x: x.split(':')[0]),
        'bonus': x[2].astype(float)
    }).set_index('participant_id').bonus.round(2)

    file = f'data/human_raw/{codeversion}/bonus.csv'
    bonus.to_csv(file, index=True, header=False)
    print(len(bonus), 'participants to receive bonuses')
    print(f'mean: ${bonus.mean():.2f}  median: ${bonus.median():.2f}')

    os.system(f'cat {file} | pbcopy')
    print(f'Wrote {file} and copied contents to clipboard.')

if __name__ == '__main__':
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
        print("Creating bonus csv for current version: ", version)

    main(version)
