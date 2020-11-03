#!/usr/bin/env python3
from fire import Fire
import subprocess
import re

def bash(x):
    return subprocess.check_output(x, shell=True).decode().strip()


def main():
    bash('cp config.txt .config.txt.bak')
    print('Created backup at ./.config.txt.bak')

    with open('config.txt', 'r') as f:
        config = f.read()

    app_url = bash('heroku domains').split('\n')[1]
    config = re.sub(r'(adserver_revproxy_host *= *)(.*)$', f'adserver_revproxy_host = {app_url}', config, flags=re.MULTILINE)
    config = re.sub(r'ad_location = https://(.*)/pub', f'ad_location = https://{app_url}/pub', config, flags=re.MULTILINE)
    with open('config.txt', 'w+') as f:
        f.write(config)
    print('Wrote config.txt')

    # db_url = bash('heroku config:get DATABASE_URL')

if __name__ == '__main__':
    Fire(main)