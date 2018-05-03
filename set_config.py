#!/usr/bin/env python2
from __future__ import print_function
from psiturk.psiturk_config import PsiturkConfig
import subprocess


def bash(x):
    return subprocess.check_output(x, shell=True).strip()

print('== Writing config.txt ==')
from jinja2 import Environment, FileSystemLoader
env = Environment(loader=FileSystemLoader('templates'))
template = env.get_template('config.txt')
with open('config.txt', 'w+') as f:
    f.write(template.render({
        'app_url': bash('heroku domains').split('\n')[1],
        'db_url': bash('heroku config:get DATABASE_URL')
    }))


print('== Setting heroku config variables ==')
CONFIG = PsiturkConfig()
CONFIG.load_config()

sections = ['psiTurk Access','AWS Access']
for section in sections:
    for key, val in CONFIG.items(section):
        if val.startswith('Your'):
            print('ERROR: {key} is not defined in ~/.psiturkconfig'.format(**locals()))
            print('http://psiturk.readthedocs.io/en/latest/configuration.html#global-configuration-file')
            exit(1)

        #print 'heroku config:set ' + '='.join(item)
        bash('heroku config:set {key}={val}'.format(**locals()))

bash('heroku config:set ON_HEROKU=true')