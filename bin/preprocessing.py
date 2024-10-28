import json

def groupby(objlist, key):
    result = {}
    for obj in objlist:
        k = obj.get(key, '')
        if k not in result:
            result[k] = []
        result[k].append(obj)
    return result

def csv_parser(f):
    def wrapper(self, *args, **kwargs):
        return f(self, *args, **kwargs)
    wrapper._parser = 'csv'
    return wrapper

def json_parser(f):
    def wrapper(self, *args, **kwargs):
        return f(self, *args, **kwargs)
    wrapper._parser = 'json'
    return wrapper

# NOTE: you'll need to edit this based on your own experiment.

class DataProcessor:
    def __init__(self, wid, events):
        self.wid = wid
        self.events = events

    @classmethod
    def load(cls, json_file):
        with open(json_file) as f:
            events = json.load(f)
            wid = json_file.split('/')[-1].replace('.json', '')
            return cls(wid, events)

    def find_events(self, query, events=None):
        if events is None:
            events = self.events

        parts = query.split('.')
        result = []
        for event in events:
            event_parts = event['event'].split('.')

            # Allow partial matches - query parts must match start of event parts
            if len(event_parts) < len(parts):
                continue
                
            match = True
            for p1, p2 in zip(parts, event_parts):
                if p1 == '*':
                    continue
                if '(' in p1:
                    options = p1.strip('()').split('|')
                    if p2 not in options:
                        match = False
                        break
                elif p1 != p2:
                    match = False
                    break
            
            if match:
                result.append(event)
        return result
    
    # define one parser method for each data file you want to produce
    # csv_parser will produce a CSV, json_parser will produce JSON
    # it should either yield or return a list of entries (rows of a CSV)
    # the name of the file is taken from the method, e.g. trials -> trials.csv
    # for csv_parser, the keys of the yielded dicts will be the column names of the output CSV file
    @csv_parser
    def trials(self):
        # Find when instructions end
        instruction_events = self.find_events("timeline.end.instructions")
        end_instructions_time = instruction_events[0]['timestamp'] if instruction_events else 0
        
        for trial_id, events in groupby(self.find_events("task"), "uniqueID").items():
            hits = len([e for e in events if e['event'].endswith('.hit')])
            outcome_event = next((e for e in events if e['event'].endswith('.outcome')), None)
            outcome = outcome_event.get('outcome') if outcome_event else None
            
            start = min(e['timestamp'] for e in events)
            end = max(e['timestamp'] for e in events)
            
            yield {
                "wid": self.wid,
                "practice": start < end_instructions_time,
                "trial_id": trial_id,
                "n_hit": hits,
                "outcome": outcome,
                "start_time": start,
                "end_time": end,
            }

    @csv_parser 
    def clicks(self):
        for event in self.find_events("task.(hit|miss|timeout)"):
            yield {
                "wid": self.wid,
                "trial_id": event.get('uniqueID'),
                "timestamp": event.get('timestamp'),
                "event_type": event['event'].split('.')[-1],
                "x": event.get('x'),
                "y": event.get('y')
            }

    @json_parser
    def survey(self):
        for event in self.find_events("survey.done"):
            yield {
                "wid": self.wid,
                "survey_id": event.get('uniqueID'),
                "results": event.get('results')
            }
   
    @csv_parser
    def debrief(self):
        event = self.find_events("debrief.submitted")[0]
        yield {
            "wid": self.wid,
            "difficulty": event.get('difficulty'),
            "feedback": event.get('feedback')
        }

    @csv_parser
    def timeline(self):
        starts = {}
        for event in self.find_events("timeline"):
            event_type = event['event']
            if '.start.' in event_type:
                block = event_type.split('.start.')[1]
                starts[block] = event['timestamp']
            elif '.end.' in event_type:
                block = event_type.split('.end.')[1]
                if block in starts:
                    yield {
                        'wid': self.wid,
                        'block': block,
                        'start': starts[block],
                        'end': event['timestamp'],
                        'duration': event['timestamp'] - starts[block]
                    }
        
