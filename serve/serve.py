#!/usr/bin/python3
from flask import abort, Flask, request
import redis

import wave, predict
import scipy.io.wavfile as wav

import random, base64, pickle, json
from functools import reduce

SPEAKER_HASH_LENGTH = 16

# Redis Keys for Predominant Data Structures
USER_IDS_SET = "user_ids"

# user:id name string training binary
PREFIX_USER = "user:"

USER_NAME = "name"
USER_TRAINING = "training_data"

app = Flask(__name__)
redis = redis.StrictRedis()

@app.route('/new_speaker', methods=['POST'])
def new_speaker():
    check_post_param('name')
    new_name = request.form['name']

    rand_bits = random.getrandbits(SPEAKER_HASH_LENGTH)
    rand_hash = base64.b64encode(bytes(str(rand_bits), 'ascii'))
    prefix = new_name[:min(4, len(new_name))]
    new_id = "{}:{}".format(prefix, rand_hash.decode('utf-8'))
    redis.sadd(USER_IDS_SET, new_id)
    redis.hmset(PREFIX_USER + new_id, {USER_NAME: new_name, USER_TRAINING: pickle.dumps(list())})
    return new_id

@app.route('/get_speakers', methods=['GET'])
def get_speakers():
    user_ids = redis.smembers(USER_IDS_SET)

    pipe = reduce(lambda p, next_id: p.hget(PREFIX_USER + next_id.decode('utf-8'), USER_NAME), user_ids, redis.pipeline())
    user_name_ids = map(lambda x: {"name":x[0].decode('utf-8'), "id":x[1].decode('utf-8')}, zip(pipe.execute(), user_ids))
    return json.dumps(list(user_name_ids))

@app.route('/learn_speaker', methods=['POST'])
def learn_speaker():
    check_post_param('id')

    request.files['wav_sample'].save('temp.wav')
    wav_info = wave.open('temp.wav', 'r')
    data, rate = wav.read('temp.wav', 'r')
    predict.play(wav_info, data, rate)
    return str(request.files)

def check_post_param(key):
    if not key in request.form:
        abort(412, "\'{}\' field required.".format(key))
    value = request.form[key]
    if len(value) == 0:
        abort(412, "\'{}\' field cannot be empty.".format(key))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80, debug=True)
