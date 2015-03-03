#!/usr/bin/python3
from flask import abort, Flask, request
from crossdomain import crossdomain
import redis

import predict

import random, base64, pickle, json
from functools import reduce

SPEAKER_HASH_LENGTH = 16

# Redis Keys for Predominant Data Structures
USER_IDS_SET = "user_ids"

# user:id name string training binary
PREFIX_USER = "user:"
USER_NAME = "name"
USER_TRAINING = "training_data"
USER_MODEL = "model_data"

app = Flask(__name__)
redis = redis.StrictRedis()

@app.route('/new_speaker', methods=['POST'])
@crossdomain(origin='*')
def new_speaker():
    check_post_param('name')
    new_name = request.form['name']

    rand_bits = random.getrandbits(SPEAKER_HASH_LENGTH)
    rand_hash = base64.b64encode(bytes(str(rand_bits), 'ascii'))
    prefix = new_name[:min(4, len(new_name))]
    new_id = "{}:{}".format(prefix, rand_hash.decode('utf-8'))
    redis.sadd(USER_IDS_SET, new_id)
    redis.hmset(hm_data(new_id), {USER_NAME: new_name})
    return new_id

@app.route('/get_speakers', methods=['GET'])
@crossdomain(origin='*')
def get_speakers():
    user_ids = redis.smembers(USER_IDS_SET)

    pipe = reduce(lambda p, next_id: p.hget(hm_data(next_id.decode('utf-8')), USER_NAME), user_ids, redis.pipeline())
    user_name_ids = map(lambda x: {"name":x[0].decode('utf-8'), "id":x[1].decode('utf-8')}, zip(pipe.execute(), user_ids))
    return json.dumps(list(user_name_ids))

@app.route('/predict', methods=['POST'])
@crossdomain(origin='*')
def predict_speaker():
    request.files['wav_sample'].save('record.wav')

    user_ids = redis.smembers(USER_IDS_SET)
    pipe = reduce(lambda p, next_id: p.hget(hm_data(next_id.decode('utf-8')), USER_MODEL), user_ids, redis.pipeline())
    models_binary = pipe.execute()
    models = list(map(lambda x: pickle.loads(x), models_binary))

    probs = predict.speaker_distribution('record.wav', user_ids, models)
    return json.dumps(probs)

@app.route('/learn_speaker', methods=['POST'])
@crossdomain(origin='*')
def learn_speaker():
    check_post_param('id')
    user_id = request.form['id']
    request.files['wav_sample'].save('temp.wav')
    user_training = None
    if redis.hexists(hm_data(user_id), USER_TRAINING):
        user_training = pickle.loads(redis.hget(hm_data(user_id), USER_TRAINING))

    gmm, mfccs = predict.learn('temp.wav', user_training)
    redis.hmset(hm_data(user_id), {USER_TRAINING: pickle.dumps(mfccs), USER_MODEL: pickle.dumps(gmm)})
    return str(len(mfccs))

def check_post_param(key):
    if not key in request.form:
        abort(412, "\'{}\' field required.".format(key))
    value = request.form[key]
    if len(value) == 0:
        abort(412, "\'{}\' field cannot be empty.".format(key))

def hm_data(user_id):
    return PREFIX_USER + user_id

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80)
