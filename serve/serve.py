#!/usr/bin/python3
from flask import abort, Flask, request

import random
import base64

SPEAKER_HASH_LENGTH = 16

app = Flask(__name__)

speakers = dict()

@app.route('/new_speaker', methods=['POST'])
def new_speaker():
    if not 'name' in request.form:
        abort(412, "\'name\' field required.")
    new_name = request.form['name']
    if len(new_name) == 0:
        abort(412, "\'name\' field cannot be empty.")
    if not new_name in speakers:
        rand_bits = random.getrandbits(SPEAKER_HASH_LENGTH)
        rand_hash = base64.b64encode(bytes(str(rand_bits), 'ascii'))
        prefix = new_name[:min(4, len(new_name))]
        speakers[new_name] = "{}:{}".format(prefix, rand_hash.decode('utf-8'))
    return speakers[new_name]

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80, debug=True)
