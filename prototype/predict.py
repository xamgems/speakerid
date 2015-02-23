import pyaudio
import random
import wave
import sys
import os.path as path

import scipy.io.wavfile as wav
import numpy as np
import pickle

from itertools import zip_longest
from functools import reduce

from features import mfcc

SNIP_LEN = 5

def main():
    voices = [sys.argv[i] for i in range(1, len(sys.argv), 2)]
    speakers = [path.splitext(path.basename(v))[0] for v in voices]
    models = [pickle.load(open(sys.argv[i], 'rb')) for i in range(2, len(sys.argv), 2)]
    sel = random.randint(0, len(voices) - 1)
    print(speakers)
    print(speakers[sel], "is speaking.")

    wav_info = wave.open(voices[sel], 'rb')
    rate, data = wav.read(voices[sel])
    play_snippet(wav_info, rate, data)
    predict(data, rate, speakers, models)

def play_snippet(wav_info, rate, data):
    snip_len = SNIP_LEN * rate
    snip_start = random.randint(0, len(data) - snip_len)
    snip_end = snip_start + snip_len
    snippet = data[snip_start:snip_end]

    p = pyaudio.PyAudio()
    astream = p.open(format=p.get_format_from_width(wav_info.getsampwidth()),
        channels=wav_info.getnchannels(),
        rate=rate,
        output=True)

    wav_info.close()
    wav_chunks = grouper(snippet, 1024, np.uint8(0))

    for frames in wav_chunks:
        wav_bytes = reduce(lambda x, y: x + y, [f.tostring() for f in frames])
        astream.write(wav_bytes)

    astream.stop_stream()
    astream.close()

def predict(data, rate, speakers, models):
    feats = mfcc(data, rate, winstep=0.1)
    counts = [0] * len(speakers)
    for f in feats:
        lls = [likelihood(f, m) for m in models]
        probs = [ll/sum(lls) for ll in lls]
        max_probs = max(enumerate(probs), key=lambda x: x[1])
        counts[max_probs[0]] += 1

    probs = [c/sum(counts) for c in counts]
    for (i, prob) in enumerate(probs):
        print("Probability that", speakers[i], "is speaking:", prob)

def likelihood(x, model):
    priors = model.weights_
    mus = model.means_
    sigmas = model.covars_
    return sum([p * mv_gaussian_pdf(x, m, s) for p, m, s in zip(priors, mus, sigmas)])

# Computes the multivariate gaussian of an array-like x. sigma is a 1D array which represents the
# diagonals of a matrix.
def mv_gaussian_pdf(x, mu, sigma):
    size = len(x)
    det = reduce(lambda x, y: x * y, sigma)
    sigma = np.diag(sigma)

    norm_const = 1.0 / (pow((2*np.pi),float(size)/2) * pow(det,1.0/2))
    x_mu = np.matrix(x - mu)
    inv = np.linalg.inv(sigma)
    exp_const = np.power(np.e, -0.5 * (x_mu * inv * x_mu.T))
    return norm_const * exp_const

def grouper(iterable, n, fillvalue=None):
    args = [iter(iterable)] * n
    return zip_longest(fillvalue=fillvalue, *args)

if __name__=='__main__':
    main()
