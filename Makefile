serve:
	python -m http.server -b localhost

dev: export FLASK_ENV=development
dev:
	python bin/herokuapp.py