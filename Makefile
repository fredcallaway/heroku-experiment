.PHONY: serve dev

PYTHON=$(shell if [ -f env/bin/python ]; then echo env/bin/python; else echo python; fi)

dev:
	(sleep 1; open http://localhost:22363/test) &
	$(PYTHON) bin/herokuapp.py
serve:
	python -m http.server -b localhost